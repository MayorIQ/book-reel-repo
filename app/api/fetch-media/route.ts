import { NextRequest, NextResponse } from 'next/server'

interface FetchMediaRequest {
  title: string
  description: string
}

interface MediaAsset {
  url: string
  type: 'image' | 'video'
  source: 'pexels' | 'unsplash'
  thumbnail?: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: FetchMediaRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body',
        },
        { status: 400 }
      )
    }

    const { title, description } = body

    // Validate inputs
    if (!title?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required',
        },
        { status: 400 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Description is required',
        },
        { status: 400 }
      )
    }

    // Check for API keys
    const pexelsKey = process.env.PEXELS_API_KEY
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

    if (!pexelsKey && !unsplashKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'No media API keys configured',
          details: 'Either PEXELS_API_KEY or UNSPLASH_ACCESS_KEY must be set',
          suggestion: 'Add at least one media API key to your .env.local file',
        },
        { status: 500 }
      )
    }

    const assets: MediaAsset[] = []

    // Extract keywords from title and description
    const keywords = `${title} ${description}`.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)
      .join(' ')

    console.log('[Fetch Media] Searching with keywords:', keywords)

    // Try Pexels for videos first
    if (pexelsKey) {
      try {
        const pexelsResponse = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=5&orientation=portrait`,
          {
            headers: {
              Authorization: pexelsKey,
            },
          }
        )

        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json()
          
          for (const video of pexelsData.videos || []) {
            // Find portrait video file
            const portraitFile = video.video_files.find(
              (file: any) => file.width < file.height || file.quality === 'hd'
            ) || video.video_files[0]

            if (portraitFile) {
              assets.push({
                url: portraitFile.link,
                type: 'video',
                source: 'pexels',
                thumbnail: video.image,
              })
            }
          }

          console.log(`[Fetch Media] Found ${pexelsData.videos?.length || 0} videos from Pexels`)
        }
      } catch (error) {
        console.error('[Fetch Media] Pexels error:', error)
      }
    }

    // Try Unsplash for images
    if (unsplashKey) {
      try {
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=8&orientation=portrait`,
          {
            headers: {
              Authorization: `Client-ID ${unsplashKey}`,
            },
          }
        )

        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json()
          
          for (const photo of unsplashData.results || []) {
            assets.push({
              url: photo.urls.regular,
              type: 'image',
              source: 'unsplash',
              thumbnail: photo.urls.thumb,
            })
          }

          console.log(`[Fetch Media] Found ${unsplashData.results?.length || 0} images from Unsplash`)
        }
      } catch (error) {
        console.error('[Fetch Media] Unsplash error:', error)
      }
    }

    // Check if we found any assets
    if (assets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No media assets found',
          suggestion: 'Try a different search term or check your API keys',
        },
        { status: 404 }
      )
    }

    console.log(`[Fetch Media] Returning ${assets.length} total assets`)

    return NextResponse.json({
      success: true,
      assets,
      count: assets.length,
    })
  } catch (error) {
    console.error('[Fetch Media] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch media',
        details: errorMessage,
        suggestion: 'Please try again or check your API configuration.',
      },
      { status: 500 }
    )
  }
}


