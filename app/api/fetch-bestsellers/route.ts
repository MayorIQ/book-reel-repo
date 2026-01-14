import { NextRequest, NextResponse } from 'next/server'
import { fetchAndStoreBestsellers, availableGenres } from '@/lib/nyt'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre') || 'Fiction'
    
    // Validate genre
    if (!availableGenres.includes(genre)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid genre. Available genres: ${availableGenres.join(', ')}`,
        },
        { status: 400 }
      )
    }
    
    const books = await fetchAndStoreBestsellers(genre)
    
    return NextResponse.json({
      success: true,
      message: `Successfully stored ${books.length} ${genre} books`,
      books: books,
    })
  } catch (error) {
    console.error('Error fetching bestsellers:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

