import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre')
    const days = searchParams.get('days')
    
    // Build filter conditions
    const where: Record<string, unknown> = {}
    
    // Filter by genre if specified
    if (genre && genre !== 'All Genres') {
      where.genre = genre
    }
    
    // Filter by duration (books updated within X days)
    if (days) {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(days))
      where.updatedAt = {
        gte: daysAgo,
      }
    }
    
    const books = await prisma.book.findMany({
      where,
      orderBy: {
        popularity_score: 'asc', // Lower rank = more popular on NYT
      },
    })

    return NextResponse.json({
      success: true,
      books: books,
    })
  } catch (error) {
    console.error('Error fetching books:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

