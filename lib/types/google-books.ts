/**
 * Shared types for Google Books API integration
 * Used by both server-side API routes and client-side helpers
 * 
 * SECURITY NOTE: These types are safe to share with the client as they
 * contain no sensitive information. API keys are handled server-side only.
 */

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for POST /api/google-books
 */
export interface GoogleBooksRequest {
  /** Book title (required) */
  title: string
  /** Book author (required) */
  author: string
  /** Optional ISBN for more accurate matching */
  isbn?: string
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Enriched book data returned from Google Books API
 * This is the primary response type for successful requests
 */
export interface GoogleBookDetails {
  /** Book title from Google Books (falls back to requested title) */
  title: string
  /** Array of authors */
  authors: string[]
  /** Book description/summary */
  description: string
  /** Publisher name */
  publisher: string
  /** Publication date (format varies: YYYY, YYYY-MM, or YYYY-MM-DD) */
  publishedDate: string
  /** Average rating (1-5 scale, null if no ratings) */
  averageRating: number | null
  /** Total number of ratings */
  ratingsCount: number | null
  /** URL to book cover thumbnail */
  thumbnail: string
}

/**
 * Error response structure
 */
export interface GoogleBooksErrorResponse {
  /** Error type identifier */
  error: string
  /** Human-readable error message */
  message?: string
}

/**
 * Not found response structure
 */
export interface GoogleBooksNotFoundResponse {
  /** Always "No match found" for 404 responses */
  message: 'No match found'
}

/**
 * Union type for all possible API responses
 */
export type GoogleBooksResponse =
  | GoogleBookDetails
  | GoogleBooksErrorResponse
  | GoogleBooksNotFoundResponse

// ============================================================================
// Cache Types (Server-side only, but safe to share)
// ============================================================================

/**
 * Data structure stored in the cache table
 * Can be either enriched book data or a "not found" marker
 */
export type CachedGoogleBooksData = GoogleBookDetails | GoogleBooksNotFoundResponse

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if response indicates book was not found
 */
export function isNotFoundResponse(
  data: unknown
): data is GoogleBooksNotFoundResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    (data as GoogleBooksNotFoundResponse).message === 'No match found'
  )
}

/**
 * Check if response is an error
 */
export function isErrorResponse(
  data: unknown
): data is GoogleBooksErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as GoogleBooksErrorResponse).error === 'string'
  )
}

/**
 * Check if response is valid book details
 */
export function isBookDetails(data: unknown): data is GoogleBookDetails {
  return (
    typeof data === 'object' &&
    data !== null &&
    'title' in data &&
    'authors' in data &&
    Array.isArray((data as GoogleBookDetails).authors) &&
    !isNotFoundResponse(data) &&
    !isErrorResponse(data)
  )
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Create default book details for fallback scenarios
 * Used when API fails or returns no results
 */
export function createDefaultBookDetails(
  title: string,
  author: string
): GoogleBookDetails {
  return {
    title,
    authors: [author],
    description: 'No description available',
    publisher: 'Unknown publisher',
    publishedDate: 'Unknown date',
    averageRating: null,
    ratingsCount: null,
    thumbnail: '',
  }
}

// ============================================================================
// Constants
// ============================================================================

/** Cache duration in milliseconds (24 hours) */
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/** Maximum results to fetch from Google Books for best-match selection */
export const MAX_GOOGLE_BOOKS_RESULTS = 5

/** Timeout for Google Books API requests in milliseconds */
export const API_TIMEOUT_MS = 10000


