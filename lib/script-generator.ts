/**
 * Script Generation Utility using OpenAI GPT
 * 
 * This module provides functions to generate video scripts using OpenAI's GPT models.
 * The scripts are optimized for different tones and durations.
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key
 * 
 * @see https://platform.openai.com/docs/api-reference/chat
 */

import OpenAI from 'openai'

// ============================================================================
// Types
// ============================================================================

export type Tone = 'Motivational' | 'Emotional' | 'Educational' | 'Aggressive' | 'Calm'

export interface ScriptResult {
  script: string
  keywords: string[]
  scenes?: string[]
}

export interface ScriptGenerationOptions {
  /** Book title */
  title: string
  /** Book description */
  description: string
  /** Desired tone for the script */
  tone: Tone
  /** Target duration in seconds */
  duration: number
  /** OpenAI model to use (default: gpt-4-turbo-preview) */
  model?: string
  /** Temperature for generation (0-2, default: 0.8) */
  temperature?: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4-turbo-preview'
const DEFAULT_TEMPERATURE = 0.8

// Tone-specific instructions for OpenAI
const TONE_INSTRUCTIONS: Record<Tone, string> = {
  Motivational: 'Create an inspiring and energizing script that motivates viewers to take action. Use powerful, action-oriented language. Include calls to action.',
  Emotional: 'Create a heartfelt and emotionally resonant script that connects with viewers on a deep level. Use empathetic language and emotional storytelling.',
  Educational: 'Create an informative and clear script that teaches valuable insights. Use structured, easy-to-understand language. Focus on key takeaways.',
  Aggressive: 'Create a bold and direct script that challenges viewers. Use strong, assertive language. Create urgency and demand immediate action.',
  Calm: 'Create a peaceful and soothing script that promotes mindfulness. Use gentle, reflective language. Encourage inner peace and self-discovery.',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get OpenAI API key from environment
 * @throws Error if API key is not configured
 */
function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. ' +
      'Please add it to your .env.local file.'
    )
  }

  return apiKey
}

/**
 * Estimate word count based on duration
 * Average speaking rate is ~150 words per minute
 */
function estimateWordCount(duration: number): number {
  const wordsPerMinute = 150
  const wordsPerSecond = wordsPerMinute / 60
  return Math.floor(duration * wordsPerSecond)
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string, title: string): string[] {
  const words = text.toLowerCase().split(/\s+/)
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ])

  const keywords = new Set<string>()
  
  // Add title words
  title.split(/\s+/).forEach(word => {
    const clean = word.toLowerCase().replace(/[^\w]/g, '')
    if (clean.length > 2 && !commonWords.has(clean)) {
      keywords.add(clean)
    }
  })

  // Add frequent words from text
  const wordFreq: Record<string, number> = {}
  words.forEach(word => {
    const clean = word.toLowerCase().replace(/[^\w]/g, '')
    if (clean.length > 3 && !commonWords.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1
    }
  })

  // Get top keywords by frequency
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  sortedWords.forEach(word => keywords.add(word))

  // Add default motivational keywords
  keywords.add('motivation')
  keywords.add('success')
  keywords.add('growth')

  return Array.from(keywords).slice(0, 8)
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate a video script using OpenAI GPT
 * 
 * @param options - Script generation options
 * @returns Promise<ScriptResult> - Generated script and keywords
 * 
 * @example
 * ```typescript
 * const result = await generateScript({
 *   title: "Atomic Habits",
 *   description: "Transform your life with tiny changes",
 *   tone: "Motivational",
 *   duration: 30
 * });
 * ```
 */
export async function generateScript(
  options: ScriptGenerationOptions
): Promise<ScriptResult> {
  const {
    title,
    description,
    tone,
    duration,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
  } = options

  // Validate inputs
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required and must be a non-empty string')
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    throw new Error('Description is required and must be a non-empty string')
  }

  const validTones: Tone[] = ['Motivational', 'Emotional', 'Educational', 'Aggressive', 'Calm']
  if (!tone || !validTones.includes(tone)) {
    throw new Error(`Tone must be one of: ${validTones.join(', ')}`)
  }

  if (!duration || duration < 10 || duration > 120) {
    throw new Error('Duration must be between 10 and 120 seconds')
  }

  // Get API key
  const apiKey = getApiKey()

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey,
  })

  // Calculate target word count
  const targetWords = estimateWordCount(duration)
  const toneInstruction = TONE_INSTRUCTIONS[tone]

  // Build the prompt
  const systemPrompt = `You are an expert video script writer specializing in creating engaging, concise scripts for social media video content. Your scripts are optimized for voice-over narration and visual storytelling.`

  const userPrompt = `Create a ${duration}-second ${tone.toLowerCase()} video script for a book promotion.

Book Title: "${title}"
Book Description: "${description}"

Requirements:
- Script should be approximately ${targetWords} words (for ${duration} seconds of narration)
- Tone: ${toneInstruction}
- Start with a hook that grabs attention
- Include the book title naturally in the script
- End with a strong call to action
- Make it engaging and suitable for social media (Instagram Reels, TikTok, YouTube Shorts)
- Write in a conversational, natural speaking style
- Avoid overly complex sentences
- Keep paragraphs short (2-3 sentences max)

Return ONLY the script text, no additional commentary or formatting.`

  console.log(`[Script Generator] Generating ${tone} script for "${title}" (${duration}s, ~${targetWords} words)`)
  console.log(`[Script Generator] Using model: ${model}`)

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: Math.floor(targetWords * 1.5), // Allow some buffer
    })

    const script = completion.choices[0]?.message?.content?.trim()

    if (!script) {
      throw new Error('OpenAI returned an empty script')
    }

    console.log(`[Script Generator] Generated script (${script.split(/\s+/).length} words)`)

    // Extract keywords
    const keywords = extractKeywords(script, title)

    // Split script into scenes (by sentences)
    const scenes = script
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 5) // Max 5 scenes

    return {
      script,
      keywords,
      scenes,
    }

  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`[Script Generator] OpenAI API error:`, error)
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.')
      }
      
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a moment.')
      }
      
      if (error.status === 400) {
        throw new Error(`Invalid request to OpenAI: ${error.message}`)
      }
      
      throw new Error(`OpenAI API error: ${error.message}`)
    }

    if (error instanceof Error) {
      console.error(`[Script Generator] Error:`, error.message)
      throw error
    }

    throw new Error('Failed to generate script')
  }
}

/**
 * Generate CapCut-optimized script with short punchy lines
 * Perfect for vertical short-form video content (TikTok, Reels, Shorts)
 * 
 * Features:
 * - Max 10 words per sentence
 * - Strong opening hook
 * - Clear emotional arc
 * - Optimized for captions
 * - Perfect for vertical video
 * 
 * @param options - Script generation options
 * @returns Promise<ScriptResult> - CapCut-optimized script
 */
export async function generateCapCutScript(
  options: ScriptGenerationOptions
): Promise<ScriptResult> {
  const {
    title,
    description,
    tone,
    duration,
    model = DEFAULT_MODEL,
    temperature = 0.9, // Higher temperature for more creative, punchy lines
  } = options

  // Validate inputs
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required and must be a non-empty string')
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    throw new Error('Description is required and must be a non-empty string')
  }

  // Get API key
  const apiKey = getApiKey()

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey,
  })

  // Calculate target word count (slightly fewer words for punchy delivery)
  const targetWords = Math.floor(estimateWordCount(duration) * 0.85) // Reduce by 15% for pauses

  // Build the prompt for CapCut-optimized content
  const systemPrompt = `You are an expert in creating viral short-form video scripts for TikTok, Instagram Reels, and YouTube Shorts. You specialize in punchy, engaging scripts optimized for CapCut editing with captions.`

  const userPrompt = `Create a ${duration}-second ${tone.toLowerCase()} video script about "${title}".

Book/Topic: "${title}"
Description: "${description}"

CRITICAL REQUIREMENTS:
✓ Each sentence MUST be 10 words or fewer
✓ Use short, punchy lines that hit hard
✓ Start with a POWERFUL hook (first 3 seconds)
✓ Create a clear emotional arc:
  - Hook (grab attention)
  - Build-up (create tension/interest)
  - Climax (key message/transformation)
  - Resolution (call to action)
✓ Write for voice-over with natural pauses
✓ Design for on-screen captions (each line = one caption)
✓ Make it shareable and quotable
✓ Use sentence variety (questions, statements, commands)
✓ Include emotional triggers
✓ End with a strong CTA

TONE: ${TONE_INSTRUCTIONS[tone]}

TARGET: ~${targetWords} words total

EXAMPLES OF GOOD PUNCHY LINES:
- "Your life is about to change."
- "Stop waiting. Start acting now."
- "This book transformed millions of lives."
- "Are you ready for real success?"

FORMAT: Return ONLY the script with each sentence on a new line. No numbering, no extra formatting.`

  console.log(`[CapCut Script] Generating punchy ${tone} script for "${title}" (${duration}s)`)

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: Math.floor(targetWords * 2), // Extra buffer for formatting
    })

    let script = completion.choices[0]?.message?.content?.trim()

    if (!script) {
      throw new Error('OpenAI returned an empty script')
    }

    // Post-process to ensure quality
    script = enforceCapCutFormat(script)

    console.log(`[CapCut Script] Generated script with ${script.split('\n').length} lines`)

    // Extract keywords
    const keywords = extractKeywords(script, title)

    // Split into scenes (each line is a caption/scene)
    const scenes = script
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    return {
      script,
      keywords,
      scenes,
    }

  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(`[CapCut Script] OpenAI API error:`, error)
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.')
      }
      
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a moment.')
      }
      
      throw new Error(`OpenAI API error: ${error.message}`)
    }

    if (error instanceof Error) {
      console.error(`[CapCut Script] Error:`, error.message)
      throw error
    }

    throw new Error('Failed to generate CapCut script')
  }
}

/**
 * Enforce CapCut format rules on generated script
 * Ensures each line is <= 10 words and properly formatted
 */
function enforceCapCutFormat(script: string): string {
  // Split by various sentence endings
  let lines = script
    .split(/[.!?]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Enforce 10-word limit per line
  const formattedLines: string[] = []
  
  lines.forEach(line => {
    const words = line.split(/\s+/)
    
    if (words.length <= 10) {
      // Line is already good
      formattedLines.push(line)
    } else {
      // Split long line into chunks of max 10 words
      for (let i = 0; i < words.length; i += 10) {
        const chunk = words.slice(i, i + 10).join(' ')
        formattedLines.push(chunk)
      }
    }
  })

  // Join with newlines for caption-friendly format
  return formattedLines.join('\n')
}

/**
 * Generate CapCut script with fallback to template
 */
export async function generateCapCutScriptWithFallback(
  options: ScriptGenerationOptions
): Promise<ScriptResult> {
  try {
    return await generateCapCutScript(options)
  } catch (error) {
    console.warn('[CapCut Script] OpenAI failed, using template fallback:', error)
    
    // Fallback to template-based CapCut script
    const { title, tone, duration } = options
    
    const punchyHooks: Record<Tone, string[]> = {
      Motivational: [
        'Stop scrolling. Your life needs this.',
        `"${title}" changed everything for me.`,
        'This book is life-changing. Period.',
        'Ready to level up? Listen close.',
      ],
      Emotional: [
        'This hit me hard. Really hard.',
        `"${title}" made me cry. In the best way.`,
        'Your heart needs to hear this.',
        'I felt seen for the first time.',
      ],
      Educational: [
        'I learned something mind-blowing today.',
        `"${title}" teaches what school never did.`,
        'This knowledge is pure gold.',
        'Pay attention. This is important.',
      ],
      Aggressive: [
        'Wake up. You\'re wasting your life.',
        `"${title}" will shake you to your core.`,
        'No more excuses. None.',
        'This is your last warning.',
      ],
      Calm: [
        'Breathe. Everything will be okay.',
        `"${title}" brought me peace at last.`,
        'Find your center. Start here.',
        'Inner peace is possible.',
      ],
    }

    const punchyBuilds: Record<Tone, string[]> = {
      Motivational: [
        'Millions have read it.',
        'Lives have been transformed.',
        'Success stories everywhere.',
        'The results are undeniable.',
      ],
      Emotional: [
        'It speaks to your soul.',
        'Every page hits different.',
        'You\'ll feel understood.',
        'Healing starts here.',
      ],
      Educational: [
        'The insights are incredible.',
        'Practical wisdom on every page.',
        'Knowledge that actually works.',
        'Learn what matters.',
      ],
      Aggressive: [
        'The truth hurts.',
        'But you need to hear it.',
        'No sugar-coating.',
        'Just raw reality.',
      ],
      Calm: [
        'Peace is within reach.',
        'One page at a time.',
        'Mindfulness becomes natural.',
        'Stillness grows.',
      ],
    }

    const punchyClosings: Record<Tone, string[]> = {
      Motivational: [
        'Your transformation starts now.',
        'Take action today.',
        'Don\'t wait another second.',
        'Become who you\'re meant to be.',
      ],
      Emotional: [
        'Let it heal you.',
        'Your heart deserves this.',
        'Start your journey now.',
        'Feel what you\'ve been missing.',
      ],
      Educational: [
        'Apply these lessons immediately.',
        'Knowledge is power.',
        'Learn it. Use it. Win.',
        'Education changes everything.',
      ],
      Aggressive: [
        'Get it now.',
        'Stop making excuses.',
        'Do it or regret it.',
        'Your choice. Make it.',
      ],
      Calm: [
        'Find your peace.',
        'The journey begins now.',
        'Breathe and believe.',
        'Serenity awaits.',
      ],
    }

    // Build script from templates
    const hook = punchyHooks[tone][0]
    const build1 = punchyBuilds[tone][0]
    const build2 = punchyBuilds[tone][1]
    const climax = `"${title}" is the answer.`
    const closing = punchyClosings[tone][0]

    const script = `${hook}\n${build1}\n${build2}\n${climax}\n${closing}`

    const keywords = extractKeywords(script, title)
    const scenes = script.split('\n').filter(s => s.length > 0)

    return { script, keywords, scenes }
  }
}

/**
 * Generate script with fallback to template-based generation
 * Useful when OpenAI is unavailable or as a backup
 */
export async function generateScriptWithFallback(
  options: ScriptGenerationOptions
): Promise<ScriptResult> {
  try {
    return await generateScript(options)
  } catch (error) {
    console.warn('[Script Generator] OpenAI failed, using template fallback:', error)
    
    // Fallback to simple template-based generation
    const { title, description, tone, duration } = options
    
    const toneIntros: Record<Tone, string> = {
      Motivational: `Ready to transform your life? "${title}" is the key to unlocking your full potential.`,
      Emotional: `Have you ever felt stuck, searching for meaning? "${title}" speaks directly to your heart.`,
      Educational: `Discover the insights that have helped millions. "${title}" offers practical wisdom.`,
      Aggressive: `Stop making excuses. "${title}" is your wake-up call to take massive action now.`,
      Calm: `In the chaos of everyday life, find peace. "${title}" guides you on a journey of self-discovery.`,
    }

    const toneClosings: Record<Tone, string> = {
      Motivational: 'Take the first step today. Your transformation begins now.',
      Emotional: 'Let this book touch your soul. The journey of healing starts here.',
      Educational: 'Apply these lessons and watch your life improve.',
      Aggressive: 'No more waiting. Get this book and change your life today.',
      Calm: 'Embrace the stillness within. Your path to peace awaits.',
    }

    const intro = toneIntros[tone]
    const closing = toneClosings[tone]
    
    const cleanDescription = description
      .split('.')[0]
      .replace(/[<>]/g, '')
      .substring(0, 150)
      .trim()

    const middleContent = cleanDescription 
      ? `This book teaches you ${cleanDescription.toLowerCase()}.` 
      : `This book will change how you see the world.`

    const script = `${intro} ${middleContent} ${closing}`

    const keywords = extractKeywords(script, title)

    return { script, keywords }
  }
}

