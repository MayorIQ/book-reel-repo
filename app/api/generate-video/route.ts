import { NextRequest, NextResponse } from 'next/server'
import { generateVoice, VOICE_IDS } from '@/lib/voice'
import { fetchVisualAssets, getFilePaths } from '@/lib/media'
import { createVideo, VideoClip } from '@/lib/video'
import { generateScriptWithFallback } from '@/lib/script-generator'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

/**
 * POST /api/generate-video
 * 
 * Video Generation Pipeline:
 * 1. generateScript() - Create video script from book info
 * 2. generateVoice() - Convert script to speech audio (ElevenLabs)
 * 3. fetchVisualAssets() - Get relevant videos/images (Pexels/Unsplash)
 * 4. createVideo() - Combine audio and visuals into final video (FFmpeg)
 */

// ============================================================================
// Types
// ============================================================================

type Tone = 'Motivational' | 'Emotional' | 'Educational' | 'Aggressive' | 'Calm'

interface GenerateVideoRequest {
  title: string
  description: string
  tone: Tone
  duration: number
}

interface ScriptResult {
  script: string
  keywords: string[]
}

interface ErrorResponse {
  success: false
  error: string
  step: string
  code: string
  details?: string
  suggestion?: string
}

// ============================================================================
// Error Codes
// ============================================================================

const ERROR_CODES = {
  INVALID_JSON: 'ERR_INVALID_JSON',
  MISSING_TITLE: 'ERR_MISSING_TITLE',
  MISSING_DESCRIPTION: 'ERR_MISSING_DESCRIPTION',
  INVALID_TONE: 'ERR_INVALID_TONE',
  INVALID_DURATION: 'ERR_INVALID_DURATION',
  SCRIPT_FAILED: 'ERR_SCRIPT_GENERATION',
  OPENAI_API_KEY_MISSING: 'ERR_OPENAI_KEY_MISSING',
  OPENAI_API_ERROR: 'ERR_OPENAI_API',
  VOICE_API_KEY_MISSING: 'ERR_ELEVENLABS_KEY_MISSING',
  VOICE_API_ERROR: 'ERR_ELEVENLABS_API',
  VOICE_QUOTA_EXCEEDED: 'ERR_ELEVENLABS_QUOTA',
  VOICE_CONTENT_MODERATION: 'ERR_CONTENT_MODERATION',
  VOICE_TEXT_VALIDATION: 'ERR_TEXT_VALIDATION',
  MEDIA_API_KEYS_MISSING: 'ERR_MEDIA_KEYS_MISSING',
  MEDIA_FETCH_FAILED: 'ERR_MEDIA_FETCH',
  MEDIA_NO_ASSETS: 'ERR_NO_ASSETS_FOUND',
  FFMPEG_NOT_INSTALLED: 'ERR_FFMPEG_MISSING',
  VIDEO_CREATION_FAILED: 'ERR_VIDEO_CREATION',
  UNKNOWN_ERROR: 'ERR_UNKNOWN',
} as const

// ============================================================================
// Helper: Create Error Response
// ============================================================================

function createErrorResponse(
  error: string,
  step: string,
  code: string,
  details?: string,
  suggestion?: string,
  status: number = 500
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error,
    step,
    code,
  }
  
  if (details) response.details = details
  if (suggestion) response.suggestion = suggestion
  
  return NextResponse.json(response, { status })
}

// ============================================================================
// Voice ID mapping by tone
// ============================================================================

const toneToVoiceId: Record<Tone, string> = {
  Motivational: VOICE_IDS.motivational,
  Emotional: VOICE_IDS.calm,
  Educational: VOICE_IDS.professional,
  Aggressive: VOICE_IDS.energetic,
  Calm: VOICE_IDS.calm,
}

// ============================================================================
// Script Generation (now uses OpenAI via lib/script-generator.ts)
// ============================================================================

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const tempFiles: string[] = []
  let currentStep = 'initialization'

  try {
    // ========================================================================
    // Parse Request Body
    // ========================================================================
    currentStep = 'parsing request'
    let body: GenerateVideoRequest
    
    try {
      body = await request.json()
    } catch (parseError) {
      return createErrorResponse(
        'Invalid JSON in request body',
        currentStep,
        ERROR_CODES.INVALID_JSON,
        parseError instanceof Error ? parseError.message : 'Could not parse JSON',
        'Ensure the request body is valid JSON with title, description, tone, and duration fields.',
        400
      )
    }

    // ========================================================================
    // Validate Inputs
    // ========================================================================
    currentStep = 'validating inputs'

    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return createErrorResponse(
        'Title is required',
        currentStep,
        ERROR_CODES.MISSING_TITLE,
        'The title field is missing or empty',
        'Provide a non-empty book title in the request body.',
        400
      )
    }

    if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
      return createErrorResponse(
        'Description is required',
        currentStep,
        ERROR_CODES.MISSING_DESCRIPTION,
        'The description field is missing or empty',
        'Provide a non-empty description or key message for the video.',
        400
      )
    }

    const validTones: Tone[] = ['Motivational', 'Emotional', 'Educational', 'Aggressive', 'Calm']
    if (!body.tone || !validTones.includes(body.tone)) {
      return createErrorResponse(
        'Invalid tone specified',
        currentStep,
        ERROR_CODES.INVALID_TONE,
        `Received tone: "${body.tone}"`,
        `Tone must be one of: ${validTones.join(', ')}`,
        400
      )
    }

    const validDurations = [30, 45, 60]
    if (!body.duration || !validDurations.includes(body.duration)) {
      return createErrorResponse(
        'Invalid duration specified',
        currentStep,
        ERROR_CODES.INVALID_DURATION,
        `Received duration: ${body.duration}`,
        `Duration must be one of: ${validDurations.join(', ')} seconds`,
        400
      )
    }

    const { title, description, tone, duration } = body

    console.log(`[Video Generation] Starting pipeline for "${title}"`)
    console.log(`  - Tone: ${tone}`)
    console.log(`  - Duration: ${duration}s`)

    // Ensure temp directory exists
    const tempDir = path.join(os.tmpdir(), 'mindshelf-video')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // ========================================================================
    // Step 1: Generate Script (using OpenAI)
    // ========================================================================
    currentStep = 'generating script'
    console.log(`[Video Generation] Step 1: ${currentStep}...`)
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Video Generation] OPENAI_API_KEY not configured, will use template fallback')
    }
    
    let scriptResult: ScriptResult
    try {
      scriptResult = await generateScriptWithFallback({
        title,
        description,
        tone,
        duration,
      })
      console.log(`[Video Generation] Script generated (${scriptResult.script.split(/\s+/).length} words)`)
      console.log(`[Video Generation] Script preview: "${scriptResult.script.substring(0, 100)}..."`)
    } catch (scriptError) {
      const errorMessage = scriptError instanceof Error ? scriptError.message : 'Unknown script generation error'
      console.error('[Video Generation] Script generation failed:', scriptError)
      
      // Check for specific OpenAI errors
      if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('not configured')) {
        return createErrorResponse(
          'OpenAI API key not configured',
          currentStep,
          ERROR_CODES.OPENAI_API_KEY_MISSING,
          errorMessage,
          'Add your OPENAI_API_KEY to .env.local. The system will use template-based scripts as a fallback.'
        )
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return createErrorResponse(
          'OpenAI rate limit exceeded',
          currentStep,
          ERROR_CODES.OPENAI_API_ERROR,
          errorMessage,
          'Please wait a moment and try again, or upgrade your OpenAI plan.'
        )
      }
      
      if (errorMessage.includes('Invalid OpenAI API key') || errorMessage.includes('401')) {
        return createErrorResponse(
          'Invalid OpenAI API key',
          currentStep,
          ERROR_CODES.OPENAI_API_ERROR,
          errorMessage,
          'Check your OPENAI_API_KEY in .env.local and ensure it is valid.'
        )
      }
      
      return createErrorResponse(
        'Failed to generate video script',
        currentStep,
        ERROR_CODES.SCRIPT_FAILED,
        errorMessage,
        'This is an internal error. Please try again or contact support.'
      )
    }

    // ========================================================================
    // Step 2: Generate Voice-Over (ElevenLabs)
    // ========================================================================
    currentStep = 'generating voice-over'
    console.log(`[Video Generation] Step 2: ${currentStep}...`)
    
    // Check API key first
    if (!process.env.ELEVENLABS_API_KEY) {
      return createErrorResponse(
        'Voice generation service not configured',
        currentStep,
        ERROR_CODES.VOICE_API_KEY_MISSING,
        'ELEVENLABS_API_KEY environment variable is not set',
        'Add your ElevenLabs API key to .env.local file: ELEVENLABS_API_KEY=your_key_here'
      )
    }
    
    let voiceFilePath: string
    try {
      const voiceResult = await generateVoice({
        text: scriptResult.script,
        voiceId: toneToVoiceId[tone],
        settings: {
          stability: tone === 'Calm' ? 0.7 : 0.5,
          similarity_boost: 0.75,
          style: tone === 'Aggressive' ? 0.8 : 0.5,
        }
      })
      
      voiceFilePath = path.join(tempDir, `voice-${Date.now()}.mp3`)
      await writeFile(voiceFilePath, voiceResult.audioBuffer)
      tempFiles.push(voiceFilePath)
      
      console.log(`[Video Generation] Voice saved to ${voiceFilePath}`)
      console.log(`[Video Generation] Estimated duration: ${voiceResult.estimatedDuration.toFixed(1)}s`)
    } catch (voiceError) {
      const errorMessage = voiceError instanceof Error ? voiceError.message : 'Unknown error'
      const lowerError = errorMessage.toLowerCase()
      console.error('[Video Generation] Voice generation failed:', voiceError)
      
      // Check for specific ElevenLabs errors
      if (lowerError.includes('401') || lowerError.includes('unauthorized') || lowerError.includes('invalid') && lowerError.includes('api key')) {
        return createErrorResponse(
          'ElevenLabs API authentication failed',
          currentStep,
          ERROR_CODES.VOICE_API_ERROR,
          'Your ElevenLabs API key is invalid or expired',
          'Check your ELEVENLABS_API_KEY in .env.local and ensure it is valid.'
        )
      }
      
      if (lowerError.includes('429') || lowerError.includes('rate limit') || lowerError.includes('quota')) {
        return createErrorResponse(
          'ElevenLabs API quota exceeded',
          currentStep,
          ERROR_CODES.VOICE_QUOTA_EXCEEDED,
          'You have exceeded your ElevenLabs character limit or rate limit',
          'Upgrade your ElevenLabs plan, wait for your quota to reset, or try again in a few minutes.'
        )
      }
      
      // Check for content moderation issues
      if (lowerError.includes('content moderation') || 
          lowerError.includes('safety') || 
          lowerError.includes('policy') ||
          lowerError.includes('inappropriate') ||
          lowerError.includes('violat')) {
        return createErrorResponse(
          'Content moderation issue detected',
          currentStep,
          ERROR_CODES.VOICE_CONTENT_MODERATION,
          errorMessage,
          'The book title or description may contain words that trigger content filters. Try rephrasing: avoid religious, political, or sensitive terms in the title.'
        )
      }
      
      // Check for text validation errors
      if (lowerError.includes('validation') || lowerError.includes('text') || lowerError.includes('422')) {
        return createErrorResponse(
          'Text validation failed',
          currentStep,
          ERROR_CODES.VOICE_TEXT_VALIDATION,
          errorMessage,
          'The script may be too long or contain unsupported characters. Try a shorter description.'
        )
      }
      
      return createErrorResponse(
        'Failed to generate voice-over audio',
        currentStep,
        ERROR_CODES.VOICE_API_ERROR,
        errorMessage,
        'Check your ElevenLabs API key and ensure the service is available. The error details above may provide more information.'
      )
    }

    // ========================================================================
    // Step 3: Fetch Visual Assets (Pexels/Unsplash)
    // ========================================================================
    currentStep = 'fetching visual assets'
    console.log(`[Video Generation] Step 3: ${currentStep}...`)
    
    // Check API keys first
    const hasPexelsKey = !!process.env.PEXELS_API_KEY
    const hasUnsplashKey = !!process.env.UNSPLASH_ACCESS_KEY
    
    if (!hasPexelsKey && !hasUnsplashKey) {
      return createErrorResponse(
        'No media API keys configured',
        currentStep,
        ERROR_CODES.MEDIA_API_KEYS_MISSING,
        'Neither PEXELS_API_KEY nor UNSPLASH_ACCESS_KEY environment variables are set',
        'Add at least one media API key to .env.local: PEXELS_API_KEY=your_key or UNSPLASH_ACCESS_KEY=your_key'
      )
    }
    
    let assetPaths: string[]
    try {
      const assets = await fetchVisualAssets(title, description, { 
        count: 6,
        orientation: 'portrait',
      })
      assetPaths = getFilePaths(assets)
      tempFiles.push(...assetPaths)
      console.log(`[Video Generation] Fetched ${assetPaths.length} visual assets`)
    } catch (mediaError) {
      const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown error'
      console.error('[Video Generation] Visual asset fetch failed:', mediaError)
      
      // Check for specific API errors
      if (errorMessage.includes('401') || errorMessage.includes('Invalid')) {
        const invalidApi = errorMessage.includes('Pexels') ? 'Pexels' : 'Unsplash'
        return createErrorResponse(
          `${invalidApi} API authentication failed`,
          currentStep,
          ERROR_CODES.MEDIA_FETCH_FAILED,
          `Your ${invalidApi} API key is invalid`,
          `Check your ${invalidApi === 'Pexels' ? 'PEXELS_API_KEY' : 'UNSPLASH_ACCESS_KEY'} in .env.local`
        )
      }
      
      return createErrorResponse(
        'Failed to fetch visual assets',
        currentStep,
        ERROR_CODES.MEDIA_FETCH_FAILED,
        errorMessage,
        'Check your media API keys and ensure Pexels/Unsplash services are available.'
      )
    }

    if (assetPaths.length === 0) {
      return createErrorResponse(
        'No visual assets found',
        currentStep,
        ERROR_CODES.MEDIA_NO_ASSETS,
        `Could not find any videos or images matching "${title}"`,
        'Try using a more generic book title or description with common keywords like "motivation", "success", or "mindset".'
      )
    }

    // ========================================================================
    // Step 4: Create Video (FFmpeg)
    // ========================================================================
    currentStep = 'creating video with FFmpeg'
    console.log(`[Video Generation] Step 4: ${currentStep}...`)

    const clips: VideoClip[] = assetPaths.map(filePath => ({
      filePath,
      type: filePath.endsWith('.mp4') || filePath.endsWith('.webm') ? 'video' : 'image',
    }))

    let videoResult
    try {
      videoResult = await createVideo(
        voiceFilePath,
        clips,
        scriptResult.script,
        {
          width: 1080,
          height: 1920,
          fps: 30,
          subtitleFontSize: 56,
        }
      )
      console.log(`[Video Generation] Video created: ${videoResult.videoUrl}`)
    } catch (videoError) {
      const errorMessage = videoError instanceof Error ? videoError.message : 'Unknown error'
      console.error('[Video Generation] Video creation failed:', videoError)
      
      // Check for FFmpeg-specific errors
      if (errorMessage.includes('ffmpeg') || errorMessage.includes('ENOENT') || errorMessage.includes('spawn')) {
        return createErrorResponse(
          'FFmpeg is not installed or not found',
          currentStep,
          ERROR_CODES.FFMPEG_NOT_INSTALLED,
          errorMessage,
          'Install FFmpeg on your system. On Windows: choco install ffmpeg. On Mac: brew install ffmpeg. On Ubuntu: sudo apt install ffmpeg'
        )
      }
      
      if (errorMessage.includes('codec') || errorMessage.includes('encoder')) {
        return createErrorResponse(
          'FFmpeg codec error',
          currentStep,
          ERROR_CODES.VIDEO_CREATION_FAILED,
          errorMessage,
          'Ensure FFmpeg is installed with libx264 and aac codec support.'
        )
      }
      
      if (errorMessage.includes('permission') || errorMessage.includes('EACCES')) {
        return createErrorResponse(
          'File permission error',
          currentStep,
          ERROR_CODES.VIDEO_CREATION_FAILED,
          errorMessage,
          'Check that the application has write permissions to the public/videos directory.'
        )
      }
      
      return createErrorResponse(
        'Failed to create video',
        currentStep,
        ERROR_CODES.VIDEO_CREATION_FAILED,
        errorMessage,
        'Check server logs for more details. Ensure FFmpeg is properly installed.'
      )
    }

    // ========================================================================
    // Cleanup Temp Files
    // ========================================================================
    currentStep = 'cleanup'
    console.log(`[Video Generation] Cleaning up ${tempFiles.length} temp files...`)
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }

    // ========================================================================
    // Step 5: Return Success Response
    // ========================================================================
    console.log(`[Video Generation] ✅ Complete!`)
    console.log(`[Video Generation] Video URL: ${videoResult.videoUrl}`)
    console.log(`[Video Generation] Duration: ${videoResult.duration.toFixed(1)}s`)
    console.log(`[Video Generation] File Size: ${(videoResult.fileSize / 1024 / 1024).toFixed(2)} MB`)

    return NextResponse.json({
      success: true,
      videoUrl: videoResult.videoUrl,
      thumbnailUrl: '/images/video-thumbnail.png',
      duration: videoResult.duration,
      fileSize: videoResult.fileSize,
    })

  } catch (error) {
    // Cleanup on error
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }

    console.error(`[Video Generation] Unexpected error during "${currentStep}":`, error)
    
    return createErrorResponse(
      'An unexpected error occurred during video generation',
      currentStep,
      ERROR_CODES.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error',
      'Please try again. If the problem persists, check server logs or contact support.'
    )
  }
}
