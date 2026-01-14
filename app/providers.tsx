'use client'

import { ReactNode } from 'react'
import { SavedBooksProvider } from '@/lib/saved-books-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SavedBooksProvider>
      {children}
    </SavedBooksProvider>
  )
}


