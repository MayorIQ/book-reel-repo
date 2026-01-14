/**
 * Google Books Client Helper
 * 
 * Client-side helper functions for fetching enriched book data.
 * These functions call the /api/google-books endpoint and handle
 * all error cases gracefully to ensure the UI never breaks.
 * 
 * SECURITY:
 * - API keys are never exposed to the client
 * - All sensitive operations happen server-side
 * 
 * RELIABILITY:
 * - Always returns valid data (defaults if API fails)
 * - Handles network errors, timeouts, and invalid responses
 * - Logs errors for debugging without crashing the UI
 */

import {
  GoogleBookDetails,
  GoogleBooksRequest,
  createDefaultBookDetails,
  isBookDetails,
  isNotFoundResponse,
} from '@/lib/types/google-books'

// Re-export types for convenience
export type { GoogleBookDetails } from '@/lib/types/google-books'

// ============================================================================
// Configuration
// ============================================================================

/** Client-side request timeout (slightly less than server to account for overhead) */
const CLIENT_TIMEOUT_MS = 12000

/** Base URL for the API endpoint */
const API_ENDPOINT = '/api/google-books'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a fetch request with timeout
 * Uses AbortController for clean timeout handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch enriched book details from the Google Books API
 * 
 * This function NEVER throws - it always returns valid data.
 * If the API fails for any reason, it returns sensible defaults.
 * 
 * @param title - Book title (required)
 * @param author - Book author (required)
 * @param isbn - Optional ISBN for more accurate matching
 * @returns Enriched book details or defaults if not found/error
 * 
 * @example
 * ```typescript
 * const details = await getGoogleBookDetails("The Great Gatsby", "F. Scott Fitzgerald")
 * // Always returns valid GoogleBookDetails, never null/undefined
 * console.log(details.title) // Safe to access
 * ```
 */
export async function getGoogleBookDetails(
  title: string,
  author: string,
  isbn?: string
): Promise<GoogleBookDetails> {
  // Create default details that will be returned if anything fails
  const defaults = createDefaultBookDetails(title, author)

  // Validate inputs
  if (!title?.trim() || !author?.trim()) {
    console.warn('[GoogleBooks] Invalid input: title and author are required')
    return defaults
  }

  try {
    // Build request body
    const requestBody: GoogleBooksRequest = {
      title: title.trim(),
      author: author.trim(),
      ...(isbn && { isbn: isbn.trim() }),
    }

    // Make API request with timeout
    const response = await fetchWithTimeout(
      API_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      CLIENT_TIMEOUT_MS
    )

    // Handle non-OK responses
    if (!response.ok) {
      // 404 is expected for books not found - don't log as error
      if (response.status === 404) {
        return defaults
      }

      // Log other errors for debugging
      console.warn(
        `[GoogleBooks] API returned ${response.status} for "${title}" by ${author}`
      )
      return defaults
    }

    // Parse response
    const data: unknown = await response.json()

    // Validate response shape
    if (isNotFoundResponse(data)) {
      return defaults
    }

    if (!isBookDetails(data)) {
      console.warn('[GoogleBooks] Invalid response shape:', data)
      return defaults
    }

    // Return enriched data with fallbacks for any missing fields
    return {
      title: data.title || defaults.title,
      authors: data.authors?.length ? data.authors : defaults.authors,
      description: data.description || defaults.description,
      publisher: data.publisher || defaults.publisher,
      publishedDate: data.publishedDate || defaults.publishedDate,
      averageRating: data.averageRating,
      ratingsCount: data.ratingsCount,
      thumbnail: data.thumbnail || defaults.thumbnail,
    }
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn(`[GoogleBooks] Request timed out for "${title}"`)
      } else if (error.message.includes('fetch')) {
        console.warn(`[GoogleBooks] Network error for "${title}":`, error.message)
      } else {
        console.error(`[GoogleBooks] Error for "${title}":`, error)
      }
    }

    return defaults
  }
}

/**
 * Fetch enriched details for multiple books in parallel
 * 
 * Uses Promise.allSettled internally to ensure all books are processed
 * even if some requests fail. Failed requests return default values.
 * 
 * @param books - Array of books with title, author, and optional ISBN
 * @returns Array of enriched book details (same order as input)
 * 
 * @example
 * ```typescript
 * const books = [
 *   { title: "1984", author: "George Orwell" },
 *   { title: "Brave New World", author: "Aldous Huxley" }
 * ]
 * const details = await getMultipleGoogleBookDetails(books)
 * // details.length === 2, guaranteed
 * ```
 */
export async function getMultipleGoogleBookDetails(
  books: Array<{ title: string; author: string; isbn?: string }>
): Promise<GoogleBookDetails[]> {
  // Handle empty input
  if (!books || books.length === 0) {
    return []
  }

  // Fetch all books in parallel using Promise.allSettled
  // This ensures all requests complete even if some fail
  const results = await Promise.allSettled(
    books.map((book) =>
      getGoogleBookDetails(book.title, book.author, book.isbn)
    )
  )

  // Extract values, using defaults for any rejected promises
  // (This shouldn't happen since getGoogleBookDetails never throws,
  // but it's a safety net)
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    // Fallback for rejected promises
    const book = books[index]
    return createDefaultBookDetails(book.title, book.author)
  })
}

/**
 * Check if a book has valid enriched data
 * Useful for conditional rendering in UI
 * 
 * @param details - Book details to check
 * @returns true if the book has meaningful data beyond defaults
 */
export function hasEnrichedData(details: GoogleBookDetails): boolean {
  return (
    details.description !== 'No description available' ||
    details.thumbnail !== '' ||
    details.averageRating !== null
  )
}
