/**
 * Video Generation Utility using FFmpeg
 * 
 * This module provides functions to create videos by combining
 * visual assets with audio narration and subtitles.
 * 
 * Prerequisites:
 * - FFmpeg must be installed on the system
 * - npm install fluent-ffmpeg @types/fluent-ffmpeg
 * 
 * Output: 1080x1920 vertical video (9:16 aspect ratio for social media reels)
 */

import ffmpeg from 'fluent-ffmpeg'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface VideoClip {
  /** Path to the video or image file */
  filePath: string
  /** Type of media */
  type: 'video' | 'image'
  /** Duration to show this clip (for images, or to trim videos) */
  duration?: number
}

export interface SubtitleSegment {
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Text to display */
  text: string
}

export interface CreateVideoOptions {
  /** Width of output video (default: 1080) */
  width?: number
  /** Height of output video (default: 1920) */
  height?: number
  /** Frame rate (default: 30) */
  fps?: number
  /** Video bitrate (default: '4000k') */
  videoBitrate?: string
  /** Audio bitrate (default: '128k') */
  audioBitrate?: string
  /** Background color for letterboxing (default: '#000000') */
  backgroundColor?: string
  /** Font for subtitles (default: 'Arial') */
  subtitleFont?: string
  /** Font size for subtitles (default: 48) */
  subtitleFontSize?: number
}

export interface VideoResult {
  /** URL path to access the video (e.g., '/videos/abc123.mp4') */
  videoUrl: string
  /** Absolute file path */
  filePath: string
  /** Duration in seconds */
  duration: number
  /** File size in bytes */
  fileSize: number
}

// ============================================================================
// Constants
// ============================================================================

const OUTPUT_DIR = 'public/videos'
const OUTPUT_WIDTH = 1080
const OUTPUT_HEIGHT = 1920

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Ensure output directory exists
 */
async function ensureOutputDir(): Promise<string> {
  const outputPath = path.join(process.cwd(), OUTPUT_DIR)
  if (!existsSync(outputPath)) {
    await mkdir(outputPath, { recursive: true })
  }
  return outputPath
}

/**
 * Generate subtitle timing from script
 * Splits script into segments based on punctuation and estimates timing
 */
export function generateSubtitleSegments(
  script: string,
  totalDuration: number
): SubtitleSegment[] {
  // Split script into sentences
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0)
    .map(s => s.trim())

  if (sentences.length === 0) {
    return []
  }

  const segments: SubtitleSegment[] = []
  const durationPerSentence = totalDuration / sentences.length
  
  // Further split long sentences for better readability
  let currentTime = 0
  
  for (const sentence of sentences) {
    // Split into chunks of ~10 words max
    const words = sentence.split(/\s+/)
    const chunks: string[] = []
    
    for (let i = 0; i < words.length; i += 8) {
      chunks.push(words.slice(i, i + 8).join(' '))
    }
    
    const chunkDuration = durationPerSentence / chunks.length
    
    for (const chunk of chunks) {
      segments.push({
        startTime: currentTime,
        endTime: currentTime + chunkDuration - 0.1, // Small gap between segments
        text: chunk,
      })
      currentTime += chunkDuration
    }
  }

  return segments
}

/**
 * Create an SRT subtitle file
 */
async function createSubtitleFile(
  segments: SubtitleSegment[],
  outputPath: string
): Promise<string> {
  const srtContent = segments
    .map((segment, index) => {
      const startTime = formatSrtTime(segment.startTime)
      const endTime = formatSrtTime(segment.endTime)
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`
    })
    .join('\n')

  const srtPath = outputPath.replace('.mp4', '.srt')
  await writeFile(srtPath, srtContent, 'utf-8')
  
  console.log(`[Video] Created subtitle file: ${srtPath}`)
  return srtPath
}

/**
 * Format seconds to SRT time format (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

/**
 * Get media duration using ffprobe
 */
function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      resolve(metadata.format.duration || 0)
    })
  })
}

/**
 * Create a video from a single clip, scaled and padded to target dimensions
 */
async function processClip(
  clip: VideoClip,
  targetDuration: number,
  width: number,
  height: number,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(clip.filePath)
    
    // For images, set duration and loop
    if (clip.type === 'image') {
      command = command
        .loop(targetDuration)
        .inputOptions(['-t', targetDuration.toString()])
    }
    
    command
      .videoFilters([
        // Scale to fit within dimensions while maintaining aspect ratio
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        // Pad to exact dimensions with black background
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        // Set frame rate
        'fps=30',
      ])
      .outputOptions([
        '-t', targetDuration.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run()
  })
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create a video from clips, audio, and script
 * 
 * @param voiceFile - Path to the narration audio file (MP3)
 * @param clips - Array of video/image clips to combine
 * @param script - Script text for generating subtitles
 * @param options - Video creation options
 * @returns Promise<VideoResult>
 * 
 * @example
 * ```typescript
 * const result = await createVideo(
 *   '/tmp/voice.mp3',
 *   [
 *     { filePath: '/tmp/clip1.mp4', type: 'video' },
 *     { filePath: '/tmp/image1.jpg', type: 'image' },
 *   ],
 *   'This is the narration script for the video.',
 *   { width: 1080, height: 1920 }
 * )
 * // result.videoUrl -> '/videos/abc123.mp4'
 * ```
 */
export async function createVideo(
  voiceFile: string,
  clips: VideoClip[],
  script: string,
  options: CreateVideoOptions = {}
): Promise<VideoResult> {
  // Validate inputs
  if (!voiceFile) {
    throw new Error('Voice file is required')
  }
  if (!clips || clips.length === 0) {
    throw new Error('At least one clip is required')
  }

  const width = options.width || OUTPUT_WIDTH
  const height = options.height || OUTPUT_HEIGHT
  const fps = options.fps || 30
  const videoBitrate = options.videoBitrate || '4000k'
  const audioBitrate = options.audioBitrate || '128k'
  const subtitleFontSize = options.subtitleFontSize || 48

  console.log(`[Video] Starting video creation`)
  console.log(`[Video] Resolution: ${width}x${height}`)
  console.log(`[Video] Clips: ${clips.length}`)

  // Ensure output directory exists
  const outputDir = await ensureOutputDir()
  const videoId = randomUUID()
  const outputPath = path.join(outputDir, `${videoId}.mp4`)
  const tempDir = '/tmp/mindshelf-video'

  // Create temp directory
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true })
  }

  try {
    // Get audio duration to determine total video length
    const audioDuration = await getMediaDuration(voiceFile)
    console.log(`[Video] Audio duration: ${audioDuration.toFixed(2)}s`)

    // Calculate duration per clip
    const clipDuration = audioDuration / clips.length
    console.log(`[Video] Duration per clip: ${clipDuration.toFixed(2)}s`)

    // Process each clip to match target dimensions
    console.log(`[Video] Processing ${clips.length} clips...`)
    const processedClips: string[] = []

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const clipOutput = path.join(tempDir, `clip_${i}.mp4`)
      
      await processClip(clip, clipDuration, width, height, clipOutput)
      processedClips.push(clipOutput)
      console.log(`[Video] Processed clip ${i + 1}/${clips.length}`)
    }

    // Create concat file for FFmpeg
    const concatFilePath = path.join(tempDir, 'concat.txt')
    const concatContent = processedClips.map(p => `file '${p}'`).join('\n')
    await writeFile(concatFilePath, concatContent, 'utf-8')

    // Generate subtitle segments
    const subtitleSegments = generateSubtitleSegments(script, audioDuration)
    const subtitlePath = await createSubtitleFile(subtitleSegments, outputPath)

    // Create final video with audio and subtitles
    console.log(`[Video] Creating final video with audio and subtitles...`)

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        // Input: concatenated clips
        .input(concatFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        // Input: audio narration
        .input(voiceFile)
        // Complex filter for subtitles
        .complexFilter([
          // Burn subtitles into video
          {
            filter: 'subtitles',
            options: {
              filename: subtitlePath,
              force_style: `FontSize=${subtitleFontSize},FontName=Arial,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=1,Alignment=2,MarginV=100`,
            },
            inputs: '0:v',
            outputs: 'v',
          },
        ])
        .outputOptions([
          '-map', '[v]',
          '-map', '1:a',
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-b:v', videoBitrate,
          '-c:a', 'aac',
          '-b:a', audioBitrate,
          '-r', fps.toString(),
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-shortest',
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log(`[Video] FFmpeg command: ${cmd.substring(0, 100)}...`)
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Video] Progress: ${progress.percent.toFixed(1)}%`)
          }
        })
        .on('end', () => {
          console.log(`[Video] Video created successfully`)
          resolve()
        })
        .on('error', (err) => {
          console.error(`[Video] FFmpeg error:`, err)
          reject(err)
        })
        .run()
    })

    // Get output file stats
    const { stat } = await import('fs/promises')
    const stats = await stat(outputPath)

    // Clean up temp files
    console.log(`[Video] Cleaning up temp files...`)
    for (const clipPath of processedClips) {
      try {
        await unlink(clipPath)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    try {
      await unlink(concatFilePath)
      await unlink(subtitlePath)
    } catch (e) {
      // Ignore cleanup errors
    }

    const videoUrl = `/videos/${videoId}.mp4`
    console.log(`[Video] Output: ${videoUrl}`)

    return {
      videoUrl,
      filePath: outputPath,
      duration: audioDuration,
      fileSize: stats.size,
    }

  } catch (error) {
    console.error(`[Video] Error creating video:`, error)
    throw error
  }
}

/**
 * Create a simple video without complex processing
 * Useful for quick previews or when FFmpeg complex filters fail
 */
export async function createSimpleVideo(
  voiceFile: string,
  imageFile: string,
  duration: number
): Promise<VideoResult> {
  const outputDir = await ensureOutputDir()
  const videoId = randomUUID()
  const outputPath = path.join(outputDir, `${videoId}.mp4`)

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(imageFile)
      .inputOptions(['-loop', '1'])
      .input(voiceFile)
      .outputOptions([
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        '-t', duration.toString(),
        '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`,
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })

  const { stat } = await import('fs/promises')
  const stats = await stat(outputPath)

  return {
    videoUrl: `/videos/${videoId}.mp4`,
    filePath: outputPath,
    duration,
    fileSize: stats.size,
  }
}


