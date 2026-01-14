'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getGoogleBookDetails, GoogleBookDetails } from '@/lib/google-books'
import { useSavedBooks } from '@/lib/saved-books-context'

// ============================================================================
// Types
// ============================================================================

interface DBBook {
  id: number
  book_title: string
  author: string
  popularity_score: number
  genre: string
}

interface BookDetails extends GoogleBookDetails {
  id: number
  rank: number
  genre: string
}

// ============================================================================
// Motivational Sections Data
// ============================================================================

const motivationalSections = [
  {
    icon: '🎯',
    title: 'Key Takeaways',
    points: [
      'Transform your daily habits with proven strategies',
      'Build unshakeable confidence through small wins',
      'Create lasting change by focusing on systems, not goals',
    ],
  },
  {
    icon: '💡',
    title: 'Who Should Read This',
    points: [
      'Anyone looking to break bad habits and build good ones',
      'Professionals seeking peak performance',
      'Those ready to take control of their destiny',
    ],
  },
  {
    icon: '⚡',
    title: 'Life-Changing Insights',
    points: [
      'Small improvements compound into remarkable results',
      'Identity-based habits create lasting transformation',
      'Environment design beats willpower every time',
    ],
  },
]

// ============================================================================
// Components
// ============================================================================

function StarRating({ rating, count, size = 'lg' }: { rating: number | null; count: number | null; size?: 'sm' | 'lg' }) {
  if (rating === null || rating === undefined) {
    return <span className="text-sand-500">No ratings yet</span>
  }

  const clampedRating = Math.max(0, Math.min(5, rating))
  const fullStars = Math.floor(clampedRating)
  const hasHalfStar = clampedRating % 1 >= 0.5
  const starSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`${starSize} ${
              i < fullStars
                ? 'text-gold-400'
                : i === fullStars && hasHalfStar
                ? 'text-gold-400'
                : 'text-warm-700'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-gold-300 font-bold text-xl">{clampedRating.toFixed(1)}</span>
      {count !== null && count > 0 && (
        <span className="text-sand-500">({count.toLocaleString()} reviews)</span>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-warm-950 animate-pulse">
      <div className="h-96 bg-warm-900" />
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
        <div className="h-8 bg-warm-800 rounded-lg w-3/4" />
        <div className="h-6 bg-warm-800 rounded-lg w-1/2" />
        <div className="h-32 bg-warm-800 rounded-lg" />
      </div>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function BookDetailsPage() {
  const params = useParams()
  const bookId = params.id as string
  const { isBookSaved, toggleSaveBook, savedBooks } = useSavedBooks()
  
  const [book, setBook] = useState<BookDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const numericBookId = parseInt(bookId, 10)
  const isSaved = isBookSaved(numericBookId)

  useEffect(() => {
    async function fetchBook() {
      try {
        // Fetch book from database
        const response = await fetch(`/api/books/${bookId}`)
        
        if (!response.ok) {
          throw new Error('Book not found')
        }
        
        const data = await response.json()
        
        if (!data.success || !data.book) {
          throw new Error('Book not found')
        }
        
        const dbBook: DBBook = data.book
        
        // Enrich with Google Books data
        const googleData = await getGoogleBookDetails(dbBook.book_title, dbBook.author)
        
        setBook({
          id: dbBook.id,
          rank: dbBook.popularity_score,
          genre: dbBook.genre,
          title: googleData.title,
          authors: googleData.authors,
          description: googleData.description,
          publisher: googleData.publisher,
          publishedDate: googleData.publishedDate,
          averageRating: googleData.averageRating,
          ratingsCount: googleData.ratingsCount,
          thumbnail: googleData.thumbnail,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load book')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchBook()
  }, [bookId])

  const handleSaveBook = () => {
    if (book) {
      toggleSaveBook({
        id: book.id,
        title: book.title,
        author: book.authors.join(', '),
        thumbnail: book.thumbnail,
        genre: book.genre,
        rank: book.rank,
      })
    }
  }

  const handleGenerateSummary = () => {
    setIsGeneratingSummary(true)
    // Simulate AI summary generation
    setTimeout(() => setIsGeneratingSummary(false), 2000)
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-warm-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-warm-900 rounded-full mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Book Not Found</h1>
          <p className="text-sand-400 mb-6">{error || "We couldn't find the book you're looking for."}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-warm-950 rounded-xl font-semibold hover:bg-gold-400 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-warm-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-warm-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-xl text-white">BookReel</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link
              href="/video-machine"
              className="inline-flex items-center gap-2 text-sand-300 hover:text-white transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create Video
            </Link>
            <Link 
              href="/library" 
              className="relative inline-flex items-center gap-2 text-sand-300 hover:text-white transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              My Library
              {savedBooks.length > 0 && (
                <span className="absolute -top-2 -right-3 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-warm-950 bg-gold-400 rounded-full">
                  {savedBooks.length > 9 ? '9+' : savedBooks.length}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-12 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/50 via-warm-950 to-warm-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <div className="relative w-72 h-[420px] mx-auto lg:mx-0 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                {book.thumbnail ? (
                  <Image
                    src={book.thumbnail}
                    alt={book.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-warm-700 to-warm-800">
                    <svg className="w-24 h-24 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                {/* NYT Badge */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 rounded-full shadow-lg">
                    <span className="text-warm-950 font-bold">#{book.rank}</span>
                    <span className="text-warm-950/70 text-sm font-medium">NYT Bestseller</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Info */}
            <div className="flex-1 text-center lg:text-left">
              {/* Genre Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-warm-800/80 border border-sand-700/50 rounded-full mb-4">
                <span className="text-gold-400 text-sm font-medium">{book.genre}</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {book.title}
              </h1>

              {/* Author */}
              <p className="text-xl text-gold-400 font-medium mb-6">
                by {book.authors.join(', ')}
              </p>

              {/* Rating */}
              <div className="mb-6">
                <StarRating rating={book.averageRating} count={book.ratingsCount} size="lg" />
              </div>

              {/* Publisher & Date */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sand-400 mb-8">
                {book.publisher !== 'Unknown publisher' && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{book.publisher}</span>
                  </div>
                )}
                {book.publishedDate !== 'Unknown date' && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{book.publishedDate}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={handleSaveBook}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-lg transition-all duration-300 ${
                    isSaved
                      ? 'bg-gold-500 text-warm-950'
                      : 'bg-warm-800 text-white hover:bg-gold-500 hover:text-warm-950'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {isSaved ? 'Saved' : 'Save Book'}
                </button>

                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-70"
                >
                  {isGeneratingSummary ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Generate Summary
                    </>
                  )}
                </button>

                <Link
                  href={`/video-machine?title=${encodeURIComponent(book.title)}&description=${encodeURIComponent(book.description.slice(0, 200))}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Create Video
                </Link>

                <button className="p-3 bg-warm-800 text-white rounded-2xl hover:bg-warm-700 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-warm-900/80 to-warm-950/80 backdrop-blur-xl rounded-3xl border border-sand-800/30 p-8 lg:p-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">📖</span>
              About This Book
            </h2>
            <p className="text-sand-300 text-lg leading-relaxed">
              {book.description}
            </p>
          </div>
        </div>
      </section>

      {/* Motivational Sections */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {motivationalSections.map((section, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-warm-900/80 to-warm-950/80 backdrop-blur-xl rounded-3xl border border-sand-800/30 p-8 hover:border-gold-500/30 transition-colors"
              >
                <div className="text-4xl mb-4">{section.icon}</div>
                <h3 className="text-xl font-bold text-white mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-sand-300">
                      <svg className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gold-500/20 to-amber-500/20 border border-gold-500/30 rounded-3xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Your Transformation?
            </h2>
            <p className="text-sand-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of readers who have already transformed their lives with the wisdom from this book.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 rounded-2xl font-bold text-lg hover:scale-105 transition-transform">
                Get This Book
              </button>
              <button className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/20 text-white rounded-2xl font-semibold text-lg hover:bg-white/10 transition-colors">
                Add to Reading List
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-warm-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold text-white">BookReel</span>
            </div>
            
            <p className="text-sand-600 text-sm">© 2026 BookReel. Transform books into videos.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

