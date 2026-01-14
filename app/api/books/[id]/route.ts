import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/books/[id]
 * Fetch a single book by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookId = parseInt(params.id, 10)

    if (isNaN(bookId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid book ID' },
        { status: 400 }
      )
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, book })
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch book' },
      { status: 500 }
    )
  }
}


