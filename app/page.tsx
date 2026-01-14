'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
  createdAt: string
  updatedAt: string
}

interface DisplayBook {
  id: number
  title: string
  author: string
  rank: number
  genre: string
  description: string
  publisher: string
  publishedDate: string
  averageRating: number | null
  ratingsCount: number | null
  thumbnail: string
  motivationalSummary: string
}

interface SearchResult {
  id: string
  title: string
  authors: string[]
  description: string
  thumbnail: string
  publishedDate: string
  averageRating?: number
  ratingsCount?: number
  publisher: string
}

// ============================================================================
// Data
// ============================================================================

// Genre filters matching NYT API lists
const genres = [
  { id: 'All Genres', label: 'All Genres', icon: '📚' },
  { id: 'Fiction', label: 'Fiction', icon: '📖' },
  { id: 'Non-Fiction', label: 'Non-Fiction', icon: '📰' },
  { id: 'Young Adult', label: 'Young Adult', icon: '🎒' },
  { id: 'Children', label: 'Children', icon: '🧒' },
  { id: 'Graphic Novels', label: 'Graphic Novels', icon: '🎨' },
  { id: 'Science', label: 'Science', icon: '🔬' },
  { id: 'Business', label: 'Business', icon: '💼' },
  { id: 'Motivational Books', label: 'Motivational', icon: '✨' },
]

const trendDurations = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

// Generate a video-focused summary based on description
function generateMotivationalSummary(description: string, title: string): string {
  if (!description || description === 'No description available') {
    return `Transform "${title}" into engaging short-form videos with AI narration and subtitles.`
  }
  // Take first sentence or first 120 chars
  const firstSentence = description.split('.')[0]
  if (firstSentence.length > 120) {
    return firstSentence.substring(0, 117) + '...'
  }
  return firstSentence + '.'
}

// ============================================================================
// Components
// ============================================================================

function Header() {
  const { savedBooks } = useSavedBooks()
  const savedCount = savedBooks.length

  return (
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
        
        <nav className="flex items-center gap-6">
          <Link href="/video-machine" className="inline-flex items-center gap-2 text-sand-300 hover:text-white transition-colors font-medium">
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
            {savedCount > 0 && (
              <span className="absolute -top-2 -right-3 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-warm-950 bg-gold-400 rounded-full">
                {savedCount > 9 ? '9+' : savedCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}

function HeroSection({ 
  onExplore,
  onSearch,
  onClearSearch,
  isSearching,
}: { 
  onExplore: () => void
  onSearch: (query: string) => void
  onClearSearch: () => void
  isSearching: boolean
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-warm-950 to-orange-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gold-500/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/20 border border-gold-500/30 rounded-full mb-8">
            <span className="text-gold-400 text-sm font-semibold tracking-wide">🎬 AI-Powered Video Generation</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Turn Books into
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-amber-400 to-orange-400">
              Viral Videos
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-sand-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform any book into captivating short-form videos with AI-powered narration, subtitles, and storyboards. 
            Perfect for TikTok, Instagram Reels, and YouTube Shorts.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={onExplore}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-gold-500/30 hover:shadow-gold-500/50 hover:scale-105 transition-all duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Browse Books
              <span className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <Link href="/video-machine" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-lg text-white border-2 border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Create Video Now
            </Link>
          </div>

          {/* Search Bar */}
          <div className="mb-10">
            <SearchBar onSearch={onSearch} onClear={onClearSearch} isSearching={isSearching} />
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-400">500+</div>
              <div className="text-sm text-sand-400">Books Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-400">10K+</div>
              <div className="text-sm text-sand-400">Videos Generated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-400">30 sec</div>
              <div className="text-sm text-sand-400">Average Creation Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GenreFilterChips({
  selectedGenre,
  onSelectGenre,
}: {
  selectedGenre: string
  onSelectGenre: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {genres.map((genre) => (
        <button
          key={genre.id}
          onClick={() => onSelectGenre(genre.id)}
          className={`group inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
            selectedGenre === genre.id
              ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 shadow-lg shadow-gold-500/30 scale-105'
              : 'bg-warm-900/80 text-sand-300 border border-sand-700/50 hover:border-gold-500/50 hover:text-white hover:bg-warm-800'
          }`}
        >
          <span className="text-base">{genre.icon}</span>
          <span>{genre.label}</span>
        </button>
      ))}
    </div>
  )
}

function SearchBar({
  onSearch,
  onClear,
  isSearching,
}: {
  onSearch: (query: string) => void
  onClear: () => void
  isSearching: boolean
}) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleClear = () => {
    setQuery('')
    onClear()
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div
        className={`relative flex items-center transition-all duration-300 ${
          isFocused
            ? 'ring-2 ring-gold-500/50 shadow-lg shadow-gold-500/20'
            : ''
        }`}
      >
        {/* Search Icon */}
        <div className="absolute left-4 pointer-events-none">
          <svg
            className={`w-5 h-5 transition-colors ${
              isFocused ? 'text-gold-400' : 'text-sand-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search for books by title, author, or topic..."
          className="w-full pl-12 pr-32 py-4 bg-warm-900/80 border border-sand-700/50 rounded-2xl text-white placeholder-sand-500 focus:outline-none focus:border-gold-500/50 transition-all"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-24 p-1 text-sand-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Search Button */}
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="absolute right-2 inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 px-5 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
        >
          {isSearching ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* Search Hints */}
      <div className="flex items-center justify-center gap-4 mt-3 text-sm text-sand-500">
        <span>Try:</span>
        <button
          type="button"
          onClick={() => { setQuery('Atomic Habits'); onSearch('Atomic Habits'); }}
          className="hover:text-gold-400 transition-colors"
        >
          "Atomic Habits"
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => { setQuery('self improvement'); onSearch('self improvement'); }}
          className="hover:text-gold-400 transition-colors"
        >
          "self improvement"
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => { setQuery('James Clear'); onSearch('James Clear'); }}
          className="hover:text-gold-400 transition-colors"
        >
          "James Clear"
        </button>
      </div>
    </form>
  )
}

function SearchResultCard({ book, onSave, isSaved }: { book: SearchResult; onSave: () => void; isSaved: boolean }) {
  return (
    <article className="group flex gap-4 p-4 bg-gradient-to-br from-warm-900/90 to-warm-950/90 backdrop-blur-xl rounded-2xl border border-sand-800/30 hover:border-gold-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10">
      {/* Thumbnail */}
      <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-warm-800">
        {book.thumbnail ? (
          <Image
            src={book.thumbnail}
            alt={book.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-warm-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white leading-tight mb-1 line-clamp-1 group-hover:text-gold-300 transition-colors">
          {book.title}
        </h3>
        <p className="text-gold-400 text-sm font-medium mb-2">
          {book.authors?.join(', ') || 'Unknown Author'}
        </p>
        <p className="text-sand-400 text-sm line-clamp-2 mb-2">
          {book.description || 'No description available'}
        </p>
        
        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-sand-500">
          {book.averageRating && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {book.averageRating.toFixed(1)}
            </span>
          )}
          {book.publishedDate && (
            <span>{book.publishedDate.substring(0, 4)}</span>
          )}
          {book.publisher && (
            <span className="line-clamp-1">{book.publisher}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onSave}
          className={`p-2 rounded-lg transition-colors ${
            isSaved
              ? 'bg-gold-500 text-warm-950'
              : 'bg-warm-800 text-sand-300 hover:bg-gold-500 hover:text-warm-950'
          }`}
          title={isSaved ? 'Saved' : 'Save book'}
        >
          <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <Link
          href={`/video-machine?title=${encodeURIComponent(book.title)}&description=${encodeURIComponent(book.description?.substring(0, 200) || '')}`}
          className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
          title="Create Video"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </Link>
      </div>
    </article>
  )
}

function StarRating({ rating, count, size = 'sm' }: { rating: number | null; count: number | null; size?: 'sm' | 'lg' }) {
  if (rating === null || rating === undefined) {
    return <span className="text-sand-500 text-xs">No ratings yet</span>
  }

  const clampedRating = Math.max(0, Math.min(5, rating))
  const fullStars = Math.floor(clampedRating)
  const hasHalfStar = clampedRating % 1 >= 0.5
  const starSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-1.5">
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
      <span className="text-gold-300 font-semibold">{clampedRating.toFixed(1)}</span>
      {count !== null && count > 0 && (
        <span className="text-sand-500 text-xs">({count.toLocaleString()})</span>
      )}
    </div>
  )
}

function BookCard({ book, index }: { book: DisplayBook; index: number }) {
  const { isBookSaved, toggleSaveBook } = useSavedBooks()
  const isSaved = isBookSaved(book.id)

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSaveBook({
      id: book.id,
      title: book.title,
      author: book.author,
      thumbnail: book.thumbnail,
      genre: book.genre,
      rank: book.rank,
    })
  }

  return (
    <article
      className="group relative bg-gradient-to-br from-warm-900/90 to-warm-950/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-sand-800/30 hover:border-gold-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-gold-500/10 hover:-translate-y-2"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* NYT Rank Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-gold-500 to-amber-500 rounded-full shadow-lg">
          <span className="text-warm-950 font-bold text-sm">#{book.rank}</span>
          <span className="text-warm-950/70 text-xs font-medium">NYT</span>
        </div>
      </div>

      {/* Thumbnail Container */}
      <div className="relative h-72 overflow-hidden bg-gradient-to-br from-warm-800 to-warm-900">
        {book.thumbnail ? (
          <Image
            src={book.thumbnail}
            alt={book.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-20 h-20 text-warm-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-warm-950 via-warm-950/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 -mt-16 relative z-10">
        {/* Title & Author */}
        <Link href={`/book/${book.id}`}>
          <h3 className="font-bold text-xl text-white leading-tight mb-1 line-clamp-2 group-hover:text-gold-300 transition-colors cursor-pointer">
            {book.title}
          </h3>
        </Link>
        <p className="text-gold-400 font-medium mb-3">by {book.author}</p>

        {/* Motivational Summary */}
        <p className="text-sand-300 text-sm leading-relaxed mb-4 line-clamp-2">
          {book.motivationalSummary}
        </p>

        {/* Rating */}
        <div className="mb-5">
          <StarRating rating={book.averageRating} count={book.ratingsCount} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              isSaved
                ? 'bg-gold-500 text-warm-950'
                : 'bg-warm-800 text-white hover:bg-gold-500 hover:text-warm-950'
            }`}
          >
            <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaved ? 'Saved' : 'Save'}
          </button>
          
          <Link
            href={`/video-machine?title=${encodeURIComponent(book.title)}&description=${encodeURIComponent(book.motivationalSummary)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Create Video
          </Link>
          
          <button className="p-2.5 rounded-xl bg-warm-800 text-white hover:bg-warm-700 transition-colors z-10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* View Details Link */}
      <Link 
        href={`/book/${book.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View details for ${book.title}`}
      />
    </article>
  )
}

function BookSkeleton() {
  return (
    <div className="bg-gradient-to-br from-warm-900/90 to-warm-950/90 rounded-3xl overflow-hidden border border-sand-800/30">
      <div className="h-72 bg-warm-800 animate-pulse" />
      <div className="p-6 -mt-16 relative z-10 space-y-3">
        <div className="h-6 bg-warm-800 rounded-lg w-3/4 animate-pulse" />
        <div className="h-4 bg-warm-800 rounded-lg w-1/2 animate-pulse" />
        <div className="h-4 bg-warm-800 rounded-lg w-full animate-pulse" />
        <div className="h-4 bg-warm-800 rounded-lg w-2/3 animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-10 bg-warm-800 rounded-xl flex-1 animate-pulse" />
          <div className="h-10 bg-warm-800 rounded-xl flex-1 animate-pulse" />
          <div className="h-10 w-10 bg-warm-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function Home() {
  const [books, setBooks] = useState<DisplayBook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('All Genres')
  const [selectedDuration, setSelectedDuration] = useState(30)
  const [error, setError] = useState<string | null>(null)
  
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  
  const { savedBooks, toggleSaveBook, isBookSaved } = useSavedBooks()

  const handleExplore = async () => {
    setIsLoading(true)
    setHasSearched(true)
    setError(null)

    try {
      // Build query params for filtering
      const params = new URLSearchParams()
      if (selectedGenre !== 'All Genres') {
        params.append('genre', selectedGenre)
      }
      params.append('days', selectedDuration.toString())

      // Fetch from NYT API for the selected genre
      if (selectedGenre !== 'All Genres') {
        await fetch(`/api/fetch-bestsellers?genre=${encodeURIComponent(selectedGenre)}`, {
          method: 'POST',
        })
      } else {
        // Fetch a default genre when "All Genres" is selected
        await fetch('/api/fetch-bestsellers?genre=Fiction', { method: 'POST' })
      }

      // Get books from database
      const response = await fetch(`/api/books?${params.toString()}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch books')
      }

      // Enrich with Google Books data
      const enrichedBooks: DisplayBook[] = await Promise.all(
        data.books.map(async (book: DBBook) => {
          const googleData = await getGoogleBookDetails(book.book_title, book.author)
          return {
            id: book.id,
            title: book.book_title,
            author: book.author,
            rank: book.popularity_score,
            genre: book.genre,
            description: googleData.description,
            publisher: googleData.publisher,
            publishedDate: googleData.publishedDate,
            averageRating: googleData.averageRating,
            ratingsCount: googleData.ratingsCount,
            thumbnail: googleData.thumbnail,
            motivationalSummary: generateMotivationalSummary(googleData.description, book.book_title),
          }
        })
      )

      setBooks(enrichedBooks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books')
      setBooks([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle genre filter change - auto-search
  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
  }

  // Scroll to books section
  const scrollToBooks = () => {
    handleExplore()
    setTimeout(() => {
      document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Handle book search
  const handleSearch = async (query: string) => {
    setIsSearching(true)
    setSearchQuery(query)
    setSearchError(null)
    setSearchResults([])

    try {
      // Use Google Books API directly for search
      const response = await fetch(`/api/search-books?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setSearchResults(data.books || [])
      
      // Scroll to search results
      setTimeout(() => {
        document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  // Clear search results
  const handleClearSearch = () => {
    setSearchResults([])
    setSearchQuery('')
    setSearchError(null)
  }

  // Handle saving a search result
  const handleSaveSearchResult = (book: SearchResult) => {
    toggleSaveBook({
      id: parseInt(book.id) || Math.random() * 1000000,
      title: book.title,
      author: book.authors?.[0] || 'Unknown',
      thumbnail: book.thumbnail || '',
      genre: 'Search Result',
      rank: 0,
    })
  }

  return (
    <div className="min-h-screen bg-warm-950">
      {/* Header */}
      <Header />
    

      {/* Hero Section */}
      <div className="pt-20">
        <HeroSection 
          onExplore={scrollToBooks} 
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          isSearching={isSearching}
        />
      </div>

      {/* Search Results Section */}
      {(searchResults.length > 0 || searchQuery) && (
        <section id="search-results" className="py-12 px-4 sm:px-6 lg:px-8 bg-warm-900/30">
          <div className="max-w-4xl mx-auto">
            {/* Search Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isSearching ? 'Searching...' : `Search Results for "${searchQuery}"`}
                </h2>
                {!isSearching && searchResults.length > 0 && (
                  <p className="text-sand-400 mt-1">
                    Found {searchResults.length} book{searchResults.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={handleClearSearch}
                className="inline-flex items-center gap-2 px-4 py-2 text-sand-400 hover:text-white bg-warm-800/50 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                {searchError}
              </div>
            )}

            {/* Loading State */}
            {isSearching && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 bg-warm-900/90 rounded-2xl animate-pulse">
                    <div className="w-20 h-28 bg-warm-800 rounded-lg" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-warm-800 rounded w-3/4" />
                      <div className="h-4 bg-warm-800 rounded w-1/2" />
                      <div className="h-4 bg-warm-800 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results List */}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((book) => (
                  <SearchResultCard
                    key={book.id}
                    book={book}
                    onSave={() => handleSaveSearchResult(book)}
                    isSaved={savedBooks.some(
                      (saved) => saved.title.toLowerCase() === book.title.toLowerCase()
                    )}
                  />
                ))}
              </div>
            )}

            {/* No Results */}
            {!isSearching && searchResults.length === 0 && searchQuery && !searchError && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-warm-800 rounded-full mb-4">
                  <svg className="w-8 h-8 text-sand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No books found</h3>
                <p className="text-sand-400">Try searching with different keywords</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Books Section */}
      <section id="books-section" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Browse by Category
            </h2>
            <p className="text-sand-400 max-w-2xl mx-auto">
              Find the perfect book for your personal development journey
            </p>
          </div>

          {/* Genre Filter Chips */}
          <div className="mb-8">
            <GenreFilterChips selectedGenre={selectedGenre} onSelectGenre={handleGenreChange} />
          </div>

          {/* Duration Filter & Search Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <div className="flex items-center gap-3">
              <label htmlFor="duration" className="text-sand-400 font-medium">
                Trending in:
              </label>
              <select
                id="duration"
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="px-4 py-2.5 bg-warm-900/80 border border-sand-700/50 rounded-xl text-gold-300 font-medium focus:outline-none focus:border-gold-500 transition-colors cursor-pointer"
              >
                {trendDurations.map((duration) => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleExplore}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Books
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {hasSearched && (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {isLoading ? 'Finding your next read...' : `${books.length} Trending Book${books.length !== 1 ? 's' : ''}`}
                  </h3>
                  {!isLoading && books.length > 0 && (
                    <p className="text-sand-400 mt-1">
                      NYT Bestsellers • {selectedGenre} • Last {selectedDuration} days
                    </p>
                  )}
                </div>
                
                {!isLoading && books.length > 0 && (
                  <select className="px-4 py-2 bg-warm-900 border border-sand-700/50 rounded-xl text-sand-300 font-medium focus:outline-none focus:border-gold-500">
                    <option>Sort by Rank</option>
                    <option>Sort by Rating</option>
                    <option>Sort by Title</option>
                  </select>
                )}
              </div>

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {/* Books Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)
                  : books.map((book, index) => (
                      <BookCard key={book.id} book={book} index={index} />
                    ))}
              </div>

              {/* Empty State */}
              {!isLoading && !error && books.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-warm-900 rounded-full mb-6">
                    <svg className="w-10 h-10 text-sand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No books found</h3>
                  <p className="text-sand-400">Try selecting a different category or check back later.</p>
                </div>
              )}
            </>
          )}

          {/* Initial State - CTA to explore */}
          {!hasSearched && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gold-500/20 to-amber-500/20 rounded-full mb-8">
                <svg className="w-12 h-12 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Ready to Transform?</h3>
              <p className="text-sand-400 mb-8 max-w-md mx-auto">
                Click below to discover life-changing motivational books from the NYT Bestsellers list.
              </p>
              <button
                onClick={handleExplore}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-gold-500/30 hover:shadow-gold-500/50 hover:scale-105 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Exploring
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-warm-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-semibold text-white">MindShelf</span>
            </div>
            
            <nav className="flex items-center gap-8">
              <a href="#" className="text-sand-500 hover:text-white transition-colors text-sm">Privacy</a>
              <a href="#" className="text-sand-500 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-sand-500 hover:text-white transition-colors text-sm">Contact</a>
            </nav>
            
            <p className="text-sand-600 text-sm">© 2024 MindShelf. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
