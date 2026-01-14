/**
 * Google Books API Enrichment Endpoint
 * 
 * This API route enriches book data with metadata from Google Books.
 * It implements caching to reduce external API calls and improve performance.
 * 
 * SECURITY:
 * - API key (GOOGLE_BOOKS_API_KEY) is only accessed server-side
 * - No sensitive data is exposed to the client
 * - Input validation prevents injection attacks
 * 
 * PERFORMANCE:
 * - 24-hour cache in Supabase reduces API calls
 * - Multi-strategy search for best match
 * - Request timeout prevents hanging
 * 
 * @route POST /api/google-books
 * @param {GoogleBooksRequest} body - { title, author, isbn? }
 * @returns {GoogleBookDetails | GoogleBooksNotFoundResponse | GoogleBooksErrorResponse}
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  GoogleBookDetails,
  GoogleBooksRequest,
  GoogleBooksNotFoundResponse,
  CachedGoogleBooksData,
  isNotFoundResponse,
  CACHE_DURATION_MS,
  MAX_GOOGLE_BOOKS_RESULTS,
  API_TIMEOUT_MS,
} from '@/lib/types/google-books'

// ============================================================================
// Internal Types (not exported - Google Books API response structure)
// ============================================================================

interface GoogleBooksVolume {
  volumeInfo: {
    title?: string
    authors?: string[]
    description?: string
    publisher?: string
    publishedDate?: string
    averageRating?: number
    ratingsCount?: number
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    industryIdentifiers?: Array<{
      type: 'ISBN_10' | 'ISBN_13' | 'OTHER'
      identifier: string
    }>
  }
}

interface GoogleBooksApiResponse {
  totalItems: number
  items?: GoogleBooksVolume[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize text for consistent cache key generation
 * Trims whitespace and converts to lowercase
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase()
}

/**
 * Validate and sanitize the request body
 * Returns null if validation fails, otherwise returns sanitized request
 */
function validateRequest(body: unknown): GoogleBooksRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const { title, author, isbn } = body as Record<string, unknown>

  // Title is required and must be a non-empty string
  if (typeof title !== 'string' || title.trim().length === 0) {
    return null
  }

  // Author is required and must be a non-empty string
  if (typeof author !== 'string' || author.trim().length === 0) {
    return null
  }

  // ISBN is optional but must be a string if provided
  if (isbn !== undefined && typeof isbn !== 'string') {
    return null
  }

  return {
    title: title.trim(),
    author: author.trim(),
    isbn: isbn ? isbn.trim() : undefined,
  }
}

/**
 * Select the best book from multiple search results
 * 
 * Priority:
 * 1. ISBN match (if ISBN provided)
 * 2. Highest average rating
 * 3. Most ratings (as a tiebreaker)
 * 4. First result (fallback)
 */
function selectBestBook(
  items: GoogleBooksVolume[],
  targetIsbn?: string
): GoogleBooksVolume {
  // Single result - return it directly
  if (items.length === 1) {
    return items[0]
  }

  // Try to find ISBN match first (most accurate)
  if (targetIsbn) {
    const normalizedIsbn = targetIsbn.replace(/[-\s]/g, '')
    const isbnMatch = items.find((item) =>
      item.volumeInfo.industryIdentifiers?.some(
        (id) => id.identifier.replace(/[-\s]/g, '') === normalizedIsbn
      )
    )
    if (isbnMatch) {
      return isbnMatch
    }
  }

  // Sort by rating (desc), then by ratings count (desc)
  const sorted = [...items].sort((a, b) => {
    const ratingA = a.volumeInfo.averageRating ?? 0
    const ratingB = b.volumeInfo.averageRating ?? 0

    if (ratingB !== ratingA) {
      return ratingB - ratingA
    }

    const countA = a.volumeInfo.ratingsCount ?? 0
    const countB = b.volumeInfo.ratingsCount ?? 0
    return countB - countA
  })

  return sorted[0]
}

/**
 * Fetch books from Google Books API with timeout handling
 * Returns null if the request fails or times out
 */
async function fetchGoogleBooks(
  query: string,
  apiKey: string,
  maxResults: number = MAX_GOOGLE_BOOKS_RESULTS
): Promise<GoogleBooksVolume[] | null> {
  const url = new URL('https://www.googleapis.com/books/v1/volumes')
  url.searchParams.set('q', query)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('maxResults', maxResults.toString())

  try {
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[Google Books API] HTTP ${response.status}: ${response.statusText}`)
      return null
    }

    const data: GoogleBooksApiResponse = await response.json()
    return data.items ?? null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Google Books API] Request timed out')
    } else {
      console.error('[Google Books API] Fetch error:', error)
    }
    return null
  }
}

/**
 * Build enriched book data from a Google Books volume
 * Provides fallback values for missing fields
 */
function buildEnrichedData(
  volume: GoogleBooksVolume,
  fallbackTitle: string,
  fallbackAuthor: string
): GoogleBookDetails {
  const info = volume.volumeInfo

  // Prefer HTTPS for thumbnails, handle protocol upgrade
  let thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || ''
  if (thumbnail.startsWith('http://')) {
    thumbnail = thumbnail.replace('http://', 'https://')
  }

  return {
    title: info.title || fallbackTitle,
    authors: info.authors || [fallbackAuthor],
    description: info.description || 'No description available',
    publisher: info.publisher || 'Unknown publisher',
    publishedDate: info.publishedDate || 'Unknown date',
    averageRating: info.averageRating ?? null,
    ratingsCount: info.ratingsCount ?? null,
    thumbnail,
  }
}

/**
 * Save data to cache using upsert
 * Handles both successful results and "not found" markers
 */
async function saveToCache(
  normalizedTitle: string,
  normalizedAuthor: string,
  data: CachedGoogleBooksData
): Promise<void> {
  try {
    await prisma.googleBooksCache.upsert({
      where: {
        title_author: {
          title: normalizedTitle,
          author: normalizedAuthor,
        },
      },
      update: {
        data: data as object,
        cached_at: new Date(),
      },
      create: {
        title: normalizedTitle,
        author: normalizedAuthor,
        data: data as object,
        cached_at: new Date(),
      },
    })
  } catch (error) {
    // Log but don't fail the request if caching fails
    console.error('[Cache] Failed to save:', error)
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // 1. Parse and validate request body
    // ========================================================================
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const validatedRequest = validateRequest(body)
    if (!validatedRequest) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Title and author are required non-empty strings',
        },
        { status: 400 }
      )
    }

    const { title, author, isbn } = validatedRequest
    const normalizedTitle = normalizeText(title)
    const normalizedAuthor = normalizeText(author)

    // ========================================================================
    // 2. Check cache first
    // ========================================================================
    try {
      const cachedEntry = await prisma.googleBooksCache.findUnique({
        where: {
          title_author: {
            title: normalizedTitle,
            author: normalizedAuthor,
          },
        },
      })

      if (cachedEntry) {
        const cacheAge = Date.now() - cachedEntry.cached_at.getTime()

        if (cacheAge < CACHE_DURATION_MS) {
          // Convert Prisma JsonValue to our type (via unknown for type safety)
          const cachedData = cachedEntry.data as unknown as CachedGoogleBooksData

          // Return cached "not found" with 404 status
          if (isNotFoundResponse(cachedData)) {
            return NextResponse.json(cachedData, { status: 404 })
          }

          // Return cached book data
          return NextResponse.json(cachedData)
        }
        // Cache expired - continue to fetch fresh data
      }
    } catch (error) {
      // Log cache error but continue with API fetch
      console.error('[Cache] Read error:', error)
    }

    // ========================================================================
    // 3. Validate API key exists
    // ========================================================================
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    if (!apiKey) {
      console.error('[Config] GOOGLE_BOOKS_API_KEY is not configured')
      return NextResponse.json(
        { error: 'CONFIG_ERROR', message: 'Server configuration error' },
        { status: 500 }
      )
    }

    // ========================================================================
    // 4. Multi-strategy search
    // ========================================================================
    let bestBook: GoogleBooksVolume | null = null

    // Strategy 1: ISBN search (most accurate, if provided)
    if (isbn) {
      const isbnQuery = `isbn:${isbn}`
      const isbnResults = await fetchGoogleBooks(isbnQuery, apiKey, 1)
      if (isbnResults && isbnResults.length > 0) {
        bestBook = isbnResults[0]
      }
    }

    // Strategy 2: Title + Author search
    if (!bestBook) {
      const titleAuthorQuery = `intitle:${title}+inauthor:${author}`
      const results = await fetchGoogleBooks(titleAuthorQuery, apiKey)
      if (results && results.length > 0) {
        bestBook = selectBestBook(results, isbn)
      }
    }

    // Strategy 3: Title-only fallback
    if (!bestBook) {
      const titleQuery = `intitle:${title}`
      const results = await fetchGoogleBooks(titleQuery, apiKey)
      if (results && results.length > 0) {
        bestBook = selectBestBook(results, isbn)
      }
    }

    // ========================================================================
    // 5. Handle "not found" case
    // ========================================================================
    if (!bestBook) {
      const notFoundData: GoogleBooksNotFoundResponse = { message: 'No match found' }
      await saveToCache(normalizedTitle, normalizedAuthor, notFoundData)
      return NextResponse.json(notFoundData, { status: 404 })
    }

    // ========================================================================
    // 6. Build response and cache
    // ========================================================================
    const enrichedData = buildEnrichedData(bestBook, title, author)
    await saveToCache(normalizedTitle, normalizedAuthor, enrichedData)

    return NextResponse.json(enrichedData)

  } catch (error) {
    console.error('[API] Unhandled error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
