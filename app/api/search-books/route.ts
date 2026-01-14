import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/search-books
 * 
 * Searches for books using Google Books API
 * Query params:
 * - q: Search query (required)
 * - maxResults: Maximum results to return (optional, default: 20)
 */

interface GoogleBooksItem {
  id: string
  volumeInfo: {
    title: string
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
    categories?: string[]
    pageCount?: number
    language?: string
  }
}

interface GoogleBooksResponse {
  totalItems: number
  items?: GoogleBooksItem[]
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const maxResults = parseInt(searchParams.get('maxResults') || '20')

    // Validate query
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Get API key (optional for Google Books, but provides higher rate limits)
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY

    // Build Google Books API URL
    const params = new URLSearchParams({
      q: query,
      maxResults: Math.min(maxResults, 40).toString(),
      orderBy: 'relevance',
      printType: 'books',
      langRestrict: 'en',
    })

    if (apiKey) {
      params.append('key', apiKey)
    }

    const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`

    console.log(`[Search] Searching for: "${query}"`)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Search] Google Books API error: ${response.status}`, errorText)
      
      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Search rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to search books' },
        { status: 500 }
      )
    }

    const data: GoogleBooksResponse = await response.json()

    // Transform results
    const books = (data.items || []).map((item) => ({
      id: item.id,
      title: item.volumeInfo.title || 'Unknown Title',
      authors: item.volumeInfo.authors || [],
      description: item.volumeInfo.description || '',
      thumbnail: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || 
                 item.volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      averageRating: item.volumeInfo.averageRating || null,
      ratingsCount: item.volumeInfo.ratingsCount || null,
      publisher: item.volumeInfo.publisher || '',
      categories: item.volumeInfo.categories || [],
      pageCount: item.volumeInfo.pageCount || null,
    }))

    console.log(`[Search] Found ${books.length} books for "${query}"`)

    return NextResponse.json({
      success: true,
      query,
      totalItems: data.totalItems || 0,
      books,
    })

  } catch (error) {
    console.error('[Search] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      },
      { status: 500 }
    )
  }
}


