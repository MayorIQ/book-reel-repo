import { prisma } from './db'

interface NYTBook {
  title: string
  author: string
  rank: number
}

interface NYTApiResponse {
  results: {
    books: {
      title: string
      author: string
      rank: number
    }[]
  }
}

// Map genre names to NYT API list names
export const genreToNYTList: Record<string, string> = {
  'Fiction': 'hardcover-fiction',
  'Non-Fiction': 'hardcover-nonfiction',
  'Young Adult': 'young-adult-hardcover',
  'Children': 'childrens-middle-grade-hardcover',
  'Graphic Novels': 'graphic-books-and-manga',
  'Science': 'science',
  'Business': 'business-books',
  'Motivational Books': 'advice-how-to-and-miscellaneous',
}

export const availableGenres = Object.keys(genreToNYTList)

export async function fetchAndStoreBestsellers(genre: string = 'Fiction') {
  const apiKey = process.env.NYT_API_KEY

  if (!apiKey) {
    throw new Error('NYT_API_KEY is not set in environment variables')
  }

  const listName = genreToNYTList[genre] || 'hardcover-fiction'

  // Fetch from NYT Bestsellers API
  const response = await fetch(
    `https://api.nytimes.com/svc/books/v3/lists/current/${listName}.json?api-key=${apiKey}`
  )

  if (!response.ok) {
    throw new Error(`NYT API error: ${response.status}`)
  }

  const data: NYTApiResponse = await response.json()
  const books: NYTBook[] = data.results.books

  // Store each book in the database with genre
  const storedBooks = await Promise.all(
    books.map(async (book) => {
      // Use upsert to avoid duplicates
      return prisma.book.upsert({
        where: {
          book_title: book.title,
        },
        update: {
          popularity_score: book.rank,
          genre: genre,
        },
        create: {
          book_title: book.title,
          author: book.author,
          popularity_score: book.rank,
          genre: genre,
        },
      })
    })
  )

  return storedBooks
}

