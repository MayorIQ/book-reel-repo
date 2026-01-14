'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSavedBooks, SavedBook } from '@/lib/saved-books-context'

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
            className="relative inline-flex items-center gap-2 text-white font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
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

function SavedBookCard({ book, onRemove }: { book: SavedBook; onRemove: () => void }) {
  return (
    <article className="group bg-gradient-to-br from-warm-900/90 to-warm-950/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-sand-800/30 hover:border-gold-500/50 transition-all duration-300">
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative w-24 h-36 flex-shrink-0 bg-warm-800">
          {book.thumbnail ? (
            <Image
              src={book.thumbnail}
              alt={book.title}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-warm-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <Link href={`/book/${book.id}`}>
              <h3 className="font-semibold text-white leading-tight mb-1 line-clamp-2 hover:text-gold-300 transition-colors">
                {book.title}
              </h3>
            </Link>
            <p className="text-gold-400 text-sm">{book.author}</p>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gold-500/20 text-gold-300 text-xs font-medium rounded-full">
                #{book.rank} NYT
              </span>
              <span className="px-2 py-0.5 bg-warm-800 text-sand-400 text-xs font-medium rounded-full">
                {book.genre}
              </span>
            </div>
            
            <button
              onClick={onRemove}
              className="p-2 text-sand-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Remove from library"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function LibraryPage() {
  const { savedBooks, removeBook, clearAllBooks } = useSavedBooks()
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const handleClearAll = () => {
    clearAllBooks()
    setShowConfirmClear(false)
  }

  return (
    <div className="min-h-screen bg-warm-950">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                My Library
              </h1>
              <p className="text-sand-400">
                {savedBooks.length === 0
                  ? 'Your saved books will appear here'
                  : `${savedBooks.length} book${savedBooks.length !== 1 ? 's' : ''} saved`}
              </p>
            </div>

            {savedBooks.length > 0 && (
              <div className="relative">
                {showConfirmClear ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearAll}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-4 py-2 bg-warm-800 text-sand-300 rounded-lg font-medium hover:bg-warm-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="px-4 py-2 text-sand-400 hover:text-red-400 transition-colors text-sm font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Empty State */}
          {savedBooks.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-warm-900 rounded-full mb-6">
                <svg className="w-10 h-10 text-sand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No saved books yet</h2>
              <p className="text-sand-400 mb-8 max-w-md mx-auto">
                Start exploring and save books you want to read later. They&apos;ll appear here for easy access.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-500 text-warm-950 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover Books
              </Link>
            </div>
          )}

          {/* Saved Books List */}
          {savedBooks.length > 0 && (
            <div className="grid gap-4">
              {savedBooks.map((book) => (
                <SavedBookCard
                  key={book.id}
                  book={book}
                  onRemove={() => removeBook(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 mt-auto">
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
            
            <p className="text-sand-600 text-sm">© 2024 MindShelf. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

