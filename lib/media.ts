/**
 * Media Assets Utility for Video Generation
 * 
 * This module provides functions to fetch visual assets (video clips and images)
 * from stock media APIs for use in video generation.
 * 
 * Primary: Pexels API for video clips
 * Fallback: Unsplash API for images
 * 
 * Environment Variables Required:
 * - PEXELS_API_KEY: Your Pexels API key
 * - UNSPLASH_ACCESS_KEY: Your Unsplash Access Key
 * 
 * @see https://www.pexels.com/api/documentation/
 * @see https://unsplash.com/documentation
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface MediaAsset {
  /** Local file path where the asset is stored */
  filePath: string
  /** Type of media asset */
  type: 'video' | 'image'
  /** Original URL from the API */
  sourceUrl: string
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Duration in seconds (for videos only) */
  duration?: number
  /** Attribution/credit information */
  attribution: string
}

export interface FetchAssetsOptions {
  /** Number of assets to fetch (default: 8) */
  count?: number
  /** Preferred video quality */
  videoQuality?: 'sd' | 'hd' | 'uhd'
  /** Preferred image size */
  imageSize?: 'small' | 'regular' | 'full'
  /** Additional search keywords */
  keywords?: string[]
  /** Orientation preference */
  orientation?: 'landscape' | 'portrait' | 'square'
}

interface PexelsVideo {
  id: number
  url: string
  duration: number
  width: number
  height: number
  video_files: Array<{
    id: number
    quality: string
    file_type: string
    width: number
    height: number
    link: string
  }>
  user: {
    name: string
    url: string
  }
}

interface PexelsSearchResponse {
  videos: PexelsVideo[]
  total_results: number
}

interface UnsplashPhoto {
  id: string
  width: number
  height: number
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    links: {
      html: string
    }
  }
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[]
  total: number
}

// ============================================================================
// Constants
// ============================================================================

const PEXELS_API_URL = 'https://api.pexels.com/videos'
const UNSPLASH_API_URL = 'https://api.unsplash.com'
const TEMP_DIR = '/tmp/mindshelf-media'

/**
 * Motivational keywords to enhance search results
 */
const MOTIVATIONAL_KEYWORDS = [
  'success',
  'motivation',
  'inspiration',
  'achievement',
  'growth',
  'sunrise',
  'nature',
  'business',
  'fitness',
  'mindfulness',
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Pexels API key from environment
 */
function getPexelsApiKey(): string {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    throw new Error(
      'PEXELS_API_KEY is not configured. ' +
      'Please add it to your .env.local file.'
    )
  }
  return apiKey
}

/**
 * Get Unsplash API key from environment
 */
function getUnsplashApiKey(): string {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  if (!apiKey) {
    throw new Error(
      'UNSPLASH_ACCESS_KEY is not configured. ' +
      'Please add it to your .env.local file.'
    )
  }
  return apiKey
}

/**
 * Ensure temp directory exists
 */
async function ensureTempDir(): Promise<string> {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true })
  }
  return TEMP_DIR
}

/**
 * Generate search query from title and description
 */
function generateSearchQuery(
  title: string,
  description: string,
  keywords?: string[]
): string {
  // Extract key words from title and description
  const combinedText = `${title} ${description}`.toLowerCase()
  
  // Find matching motivational keywords
  const matchingKeywords = MOTIVATIONAL_KEYWORDS.filter(
    keyword => combinedText.includes(keyword)
  )

  // Build search query
  const searchTerms = [
    ...matchingKeywords.slice(0, 2),
    ...(keywords || []).slice(0, 2),
  ]

  // Default to 'motivation inspiration' if no matches
  if (searchTerms.length === 0) {
    searchTerms.push('motivation', 'inspiration')
  }

  return searchTerms.join(' ')
}

/**
 * Download a file from URL and save to temp directory
 */
async function downloadFile(
  url: string,
  extension: string
): Promise<string> {
  const tempDir = await ensureTempDir()
  const fileName = `${randomUUID()}.${extension}`
  const filePath = path.join(tempDir, fileName)

  console.log(`[Media] Downloading: ${url.substring(0, 50)}...`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(filePath, buffer)

  console.log(`[Media] Saved to: ${filePath}`)
  return filePath
}

/**
 * Select the best video file based on quality preference
 */
function selectVideoFile(
  videoFiles: PexelsVideo['video_files'],
  quality: 'sd' | 'hd' | 'uhd'
): PexelsVideo['video_files'][0] | null {
  // Sort by quality preference
  const qualityOrder = quality === 'uhd' 
    ? ['uhd', 'hd', 'sd'] 
    : quality === 'hd' 
      ? ['hd', 'sd', 'uhd'] 
      : ['sd', 'hd', 'uhd']

  for (const q of qualityOrder) {
    const file = videoFiles.find(
      f => f.quality === q && f.file_type === 'video/mp4'
    )
    if (file) return file
  }

  // Fallback to any mp4 file
  return videoFiles.find(f => f.file_type === 'video/mp4') || null
}

// ============================================================================
// Pexels API Functions
// ============================================================================

/**
 * Search for videos on Pexels
 */
async function searchPexelsVideos(
  query: string,
  count: number,
  orientation?: 'landscape' | 'portrait' | 'square'
): Promise<PexelsVideo[]> {
  const apiKey = getPexelsApiKey()

  const params = new URLSearchParams({
    query,
    per_page: Math.min(count * 2, 80).toString(), // Fetch extra in case some fail
    orientation: orientation || 'landscape',
  })

  const response = await fetch(`${PEXELS_API_URL}/search?${params}`, {
    headers: {
      Authorization: apiKey,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Pexels API key')
    }
    throw new Error(`Pexels API error: ${response.status}`)
  }

  const data: PexelsSearchResponse = await response.json()
  console.log(`[Media] Found ${data.total_results} Pexels videos`)

  return data.videos
}

/**
 * Fetch video clips from Pexels
 */
async function fetchPexelsVideos(
  title: string,
  description: string,
  options: FetchAssetsOptions
): Promise<MediaAsset[]> {
  const query = generateSearchQuery(title, description, options.keywords)
  console.log(`[Media] Searching Pexels for: "${query}"`)

  const videos = await searchPexelsVideos(
    query,
    options.count || 8,
    options.orientation
  )

  const assets: MediaAsset[] = []
  const targetCount = options.count || 8

  for (const video of videos) {
    if (assets.length >= targetCount) break

    try {
      const videoFile = selectVideoFile(
        video.video_files,
        options.videoQuality || 'hd'
      )

      if (!videoFile) {
        console.log(`[Media] No suitable video file for ${video.id}`)
        continue
      }

      const filePath = await downloadFile(videoFile.link, 'mp4')

      assets.push({
        filePath,
        type: 'video',
        sourceUrl: video.url,
        width: videoFile.width,
        height: videoFile.height,
        duration: video.duration,
        attribution: `Video by ${video.user.name} on Pexels`,
      })

    } catch (error) {
      console.error(`[Media] Failed to download video ${video.id}:`, error)
      // Continue to next video
    }
  }

  return assets
}

// ============================================================================
// Unsplash API Functions
// ============================================================================

/**
 * Search for photos on Unsplash
 */
async function searchUnsplashPhotos(
  query: string,
  count: number,
  orientation?: 'landscape' | 'portrait' | 'squarish'
): Promise<UnsplashPhoto[]> {
  const apiKey = getUnsplashApiKey()

  const params = new URLSearchParams({
    query,
    per_page: Math.min(count * 2, 30).toString(),
    orientation: orientation || 'landscape',
  })

  const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
    headers: {
      Authorization: `Client-ID ${apiKey}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Unsplash API key')
    }
    throw new Error(`Unsplash API error: ${response.status}`)
  }

  const data: UnsplashSearchResponse = await response.json()
  console.log(`[Media] Found ${data.total} Unsplash photos`)

  return data.results
}

/**
 * Fetch images from Unsplash
 */
async function fetchUnsplashImages(
  title: string,
  description: string,
  options: FetchAssetsOptions
): Promise<MediaAsset[]> {
  const query = generateSearchQuery(title, description, options.keywords)
  console.log(`[Media] Searching Unsplash for: "${query}"`)

  // Map orientation for Unsplash
  const orientation = options.orientation === 'square' ? 'squarish' : options.orientation

  const photos = await searchUnsplashPhotos(
    query,
    options.count || 8,
    orientation as 'landscape' | 'portrait' | 'squarish'
  )

  const assets: MediaAsset[] = []
  const targetCount = options.count || 8

  for (const photo of photos) {
    if (assets.length >= targetCount) break

    try {
      // Select URL based on size preference
      const sizeMap = {
        small: photo.urls.small,
        regular: photo.urls.regular,
        full: photo.urls.full,
      }
      const imageUrl = sizeMap[options.imageSize || 'regular']

      const filePath = await downloadFile(imageUrl, 'jpg')

      assets.push({
        filePath,
        type: 'image',
        sourceUrl: photo.urls.regular,
        width: photo.width,
        height: photo.height,
        attribution: `Photo by ${photo.user.name} on Unsplash`,
      })

    } catch (error) {
      console.error(`[Media] Failed to download image ${photo.id}:`, error)
      // Continue to next image
    }
  }

  return assets
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Fetch visual assets for video generation
 * 
 * Primary: Attempts to fetch video clips from Pexels
 * Fallback: If videos unavailable, fetches images from Unsplash
 * 
 * @param title - Book/content title for search context
 * @param description - Description for additional search context
 * @param options - Configuration options
 * @returns Promise<MediaAsset[]> - Array of downloaded assets with file paths
 * 
 * @example
 * ```typescript
 * const assets = await fetchVisualAssets(
 *   "Atomic Habits",
 *   "Transform your life with tiny changes"
 * );
 * // assets[0].filePath -> '/tmp/mindshelf-media/abc123.mp4'
 * ```
 */
export async function fetchVisualAssets(
  title: string,
  description: string,
  options: FetchAssetsOptions = {}
): Promise<MediaAsset[]> {
  // Validate inputs
  if (!title || typeof title !== 'string') {
    throw new Error('Title is required')
  }

  const targetCount = options.count || 8
  console.log(`[Media] Fetching ${targetCount} visual assets for "${title}"`)

  let assets: MediaAsset[] = []

  // Try Pexels videos first
  try {
    const hasPexelsKey = !!process.env.PEXELS_API_KEY
    
    if (hasPexelsKey) {
      console.log('[Media] Attempting to fetch videos from Pexels...')
      assets = await fetchPexelsVideos(title, description, options)
      console.log(`[Media] Got ${assets.length} video clips from Pexels`)
    }
  } catch (error) {
    console.error('[Media] Pexels fetch failed:', error)
  }

  // Fallback to Unsplash images if needed
  const remainingCount = targetCount - assets.length
  
  if (remainingCount > 0) {
    try {
      const hasUnsplashKey = !!process.env.UNSPLASH_ACCESS_KEY
      
      if (hasUnsplashKey) {
        console.log(`[Media] Fetching ${remainingCount} images from Unsplash...`)
        const images = await fetchUnsplashImages(title, description, {
          ...options,
          count: remainingCount,
        })
        assets = [...assets, ...images]
        console.log(`[Media] Got ${images.length} images from Unsplash`)
      }
    } catch (error) {
      console.error('[Media] Unsplash fetch failed:', error)
    }
  }

  // Final check
  if (assets.length === 0) {
    throw new Error(
      'Failed to fetch any visual assets. ' +
      'Please check your PEXELS_API_KEY and UNSPLASH_ACCESS_KEY.'
    )
  }

  console.log(`[Media] Total assets fetched: ${assets.length}`)
  console.log(`[Media] Videos: ${assets.filter(a => a.type === 'video').length}`)
  console.log(`[Media] Images: ${assets.filter(a => a.type === 'image').length}`)

  return assets
}

/**
 * Clean up temporary media files
 * Call this after video generation is complete
 */
export async function cleanupMediaFiles(assets: MediaAsset[]): Promise<void> {
  const { unlink } = await import('fs/promises')

  for (const asset of assets) {
    try {
      await unlink(asset.filePath)
      console.log(`[Media] Deleted: ${asset.filePath}`)
    } catch (error) {
      console.error(`[Media] Failed to delete ${asset.filePath}:`, error)
    }
  }
}

/**
 * Get file paths from media assets
 * Convenience function for use in video generation
 */
export function getFilePaths(assets: MediaAsset[]): string[] {
  return assets.map(asset => asset.filePath)
}


