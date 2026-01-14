/**
 * Subtitle Generation Utility
 * 
 * Generates SRT (SubRip Subtitle) files with timestamps from script text.
 * Optimized for CapCut and short-form video editing.
 * 
 * Rules:
 * - Each caption max 2 lines
 * - Captions synced evenly across narration duration
 * - Uses script sentences as captions
 * - Starts from 00:00:00,000
 */

interface SubtitleSegment {
  index: number
  startTime: string
  endTime: string
  text: string
  lines: string[] // Max 2 lines
}

/**
 * Convert seconds to SRT timestamp format (HH:MM:SS,mmm)
 * Always starts from 00:00:00,000
 */
function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds
    .toString()
    .padStart(3, '0')}`
}

/**
 * Split text into max 2 lines for readability
 * Tries to split at natural break points (commas, conjunctions)
 */
function splitIntoTwoLines(text: string, maxCharsPerLine: number = 42): string[] {
  const words = text.trim().split(/\s+/)
  
  // If text is short, return as single line
  if (text.length <= maxCharsPerLine) {
    return [text]
  }

  // Find optimal split point (around middle, at natural break)
  const midPoint = Math.floor(words.length / 2)
  let splitIndex = midPoint

  // Look for natural break points near the middle
  const breakWords = new Set(['and', 'but', 'or', 'so', 'yet', 'for', 'nor'])
  for (let i = midPoint - 2; i <= midPoint + 2; i++) {
    if (i > 0 && i < words.length && breakWords.has(words[i].toLowerCase())) {
      splitIndex = i
      break
    }
  }

  const line1 = words.slice(0, splitIndex).join(' ')
  const line2 = words.slice(splitIndex).join(' ')

  return [line1, line2].filter(line => line.length > 0)
}

/**
 * Parse script into sentences
 * Handles both standard scripts and CapCut-optimized scripts (with newlines)
 */
function parseScriptSentences(script: string): string[] {
  // First, try splitting by newlines (for CapCut-optimized scripts)
  const lineBreaks = script.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // If we have multiple lines, likely a CapCut script
  if (lineBreaks.length > 3) {
    return lineBreaks
  }

  // Otherwise, split by sentence endings
  const sentences = script
    .split(/([.!?]+)/)
    .reduce((acc: string[], part, index, array) => {
      if (index % 2 === 0 && part.trim()) {
        const punctuation = array[index + 1] || ''
        acc.push((part + punctuation).trim())
      }
      return acc
    }, [])
    .filter(s => s.length > 0)

  return sentences
}

/**
 * Generate SRT subtitle file content with even timing distribution
 * 
 * Requirements:
 * - Each caption max 2 lines
 * - Captions synced evenly across narration duration
 * - Uses script sentences as captions
 * - Starts from 00:00:00,000
 * 
 * @param script - The full script text
 * @param totalDuration - Total duration in seconds (required for proper sync)
 * @returns SRT formatted subtitle string
 * 
 * @example
 * ```typescript
 * const srt = generateSubtitles("Transform your life today.\nStart with small habits.", 10)
 * // Returns:
 * // 1
 * // 00:00:00,000 --> 00:00:05,000
 * // Transform your life today.
 * //
 * // 2
 * // 00:00:05,000 --> 00:00:10,000
 * // Start with small habits.
 * ```
 */
export function generateSubtitles(script: string, totalDuration: number): string {
  // Validation
  if (!script || script.trim().length === 0) {
    throw new Error('Script is required for subtitle generation')
  }

  if (!totalDuration || totalDuration <= 0) {
    throw new Error('Total duration must be a positive number')
  }

  // Parse script into sentences
  const sentences = parseScriptSentences(script)
  
  if (sentences.length === 0) {
    throw new Error('Could not parse any sentences from script')
  }

  // Calculate even distribution of time across all sentences
  const segmentCount = sentences.length
  const segmentDuration = totalDuration / segmentCount

  // Minimum duration per segment (1 second)
  const minDuration = 1.0
  const adjustedSegmentDuration = Math.max(minDuration, segmentDuration)

  // Build subtitle segments with even timing
  const subtitleSegments: SubtitleSegment[] = []
  let currentTime = 0 // Start from 00:00:00,000

  sentences.forEach((sentence, index) => {
    const startTime = currentTime
    const endTime = Math.min(currentTime + adjustedSegmentDuration, totalDuration)

    // Split into max 2 lines for readability
    const lines = splitIntoTwoLines(sentence)
    const text = lines.join('\n')

    subtitleSegments.push({
      index: index + 1,
      startTime: formatSRTTimestamp(startTime),
      endTime: formatSRTTimestamp(endTime),
      text: text,
      lines: lines,
    })

    currentTime = endTime
  })

  // Generate SRT format
  return subtitleSegments
    .map(segment => {
      return `${segment.index}\n${segment.startTime} --> ${segment.endTime}\n${segment.text}\n`
    })
    .join('\n')
}

/**
 * Generate subtitles with word-count based timing (fallback method)
 * Uses when total duration is not available
 */
export function generateSubtitlesWithEstimatedTiming(script: string): string {
  const sentences = parseScriptSentences(script)
  const wordsPerSecond = 2.5 // Average speaking rate
  
  const subtitleSegments: SubtitleSegment[] = []
  let currentTime = 0 // Start from 00:00:00,000

  sentences.forEach((sentence, index) => {
    const wordCount = sentence.split(/\s+/).length
    const duration = Math.max(1.5, wordCount / wordsPerSecond) // Min 1.5s per caption
    
    const startTime = currentTime
    const endTime = currentTime + duration

    const lines = splitIntoTwoLines(sentence)
    const text = lines.join('\n')

    subtitleSegments.push({
      index: index + 1,
      startTime: formatSRTTimestamp(startTime),
      endTime: formatSRTTimestamp(endTime),
      text: text,
      lines: lines,
    })

    currentTime = endTime
  })

  return subtitleSegments
    .map(segment => {
      return `${segment.index}\n${segment.startTime} --> ${segment.endTime}\n${segment.text}\n`
    })
    .join('\n')
}

/**
 * Parse SRT timestamp to seconds
 */
function parseTimeToSeconds(timestamp: string): number {
  const [time, ms] = timestamp.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000
}

/**
 * Validate SRT format
 */
export function validateSRT(srtContent: string): boolean {
  const lines = srtContent.trim().split('\n')
  
  // Should have at least 4 lines (index, timestamp, text, empty line)
  if (lines.length < 4) return false
  
  // Check if first line is a number (segment index)
  if (isNaN(Number(lines[0]))) return false
  
  // Check if second line has timestamp arrow
  if (!lines[1].includes('-->')) return false
  
  return true
}

/**
 * Get subtitle statistics
 */
export function getSubtitleStats(srtContent: string): {
  segmentCount: number
  totalDuration: number
  averageSegmentLength: number
} {
  const segments = srtContent.split('\n\n').filter(s => s.trim())
  
  let totalDuration = 0
  let totalWords = 0

  segments.forEach(segment => {
    const lines = segment.split('\n')
    if (lines.length >= 3) {
      const timestamp = lines[1]
      const [, endTime] = timestamp.split('-->').map(t => t.trim())
      totalDuration = Math.max(totalDuration, parseTimeToSeconds(endTime))
      
      const text = lines.slice(2).join(' ')
      totalWords += text.split(/\s+/).length
    }
  })

  return {
    segmentCount: segments.length,
    totalDuration,
    averageSegmentLength: totalWords / segments.length,
  }
}

