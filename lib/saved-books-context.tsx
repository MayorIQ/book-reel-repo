'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface SavedBook {
  id: number
  title: string
  author: string
  thumbnail: string
  genre: string
  rank: number
  savedAt: string
}

interface SavedBooksContextType {
  savedBooks: SavedBook[]
  addBook: (book: Omit<SavedBook, 'savedAt'>) => void
  removeBook: (id: number) => void
  isBookSaved: (id: number) => boolean
  toggleSaveBook: (book: Omit<SavedBook, 'savedAt'>) => void
  clearAllBooks: () => void
}

// ============================================================================
// Context
// ============================================================================

const SavedBooksContext = createContext<SavedBooksContextType | undefined>(undefined)

const STORAGE_KEY = 'mindshelf-saved-books'

// ============================================================================
// Provider
// ============================================================================

export function SavedBooksProvider({ children }: { children: ReactNode }) {
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved books from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setSavedBooks(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load saved books:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever savedBooks changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBooks))
      } catch (error) {
        console.error('Failed to save books:', error)
      }
    }
  }, [savedBooks, isLoaded])

  const addBook = (book: Omit<SavedBook, 'savedAt'>) => {
    setSavedBooks((prev) => {
      // Don't add if already saved
      if (prev.some((b) => b.id === book.id)) {
        return prev
      }
      return [...prev, { ...book, savedAt: new Date().toISOString() }]
    })
  }

  const removeBook = (id: number) => {
    setSavedBooks((prev) => prev.filter((book) => book.id !== id))
  }

  const isBookSaved = (id: number) => {
    return savedBooks.some((book) => book.id === id)
  }

  const toggleSaveBook = (book: Omit<SavedBook, 'savedAt'>) => {
    if (isBookSaved(book.id)) {
      removeBook(book.id)
    } else {
      addBook(book)
    }
  }

  const clearAllBooks = () => {
    setSavedBooks([])
  }

  return (
    <SavedBooksContext.Provider
      value={{
        savedBooks,
        addBook,
        removeBook,
        isBookSaved,
        toggleSaveBook,
        clearAllBooks,
      }}
    >
      {children}
    </SavedBooksContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useSavedBooks() {
  const context = useContext(SavedBooksContext)
  if (context === undefined) {
    throw new Error('useSavedBooks must be used within a SavedBooksProvider')
  }
  return context
}


