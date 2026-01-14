/**
 * Production-Grade ElevenLabs Text-to-Speech Integration
 * 
 * This module provides fault-tolerant, validated voice generation with:
 * - Runtime voice validation
 * - Capability-aware voice profiles
 * - Safe model enforcement
 * - Silent failure protection
 * - Comprehensive error handling
 * 
 * Environment Variables Required:
 * - ELEVENLABS_API_KEY: Your ElevenLabs API key
 * 
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supported tone presets for voice selection
 */
export type VoiceTone = 'motivational' | 'calm' | 'energetic' | 'narrative' | 'professional'

/**
 * Voice profile with validated capabilities
 */
export interface VoiceProfile {
  voiceId: string
  name: string
  category?: string
  labels?: Record<string, string>
  supportsStyle: boolean
  supportsSpeakerBoost: boolean
  recommendedModel: string
}

/**
 * Voice settings (only used if voice supports them)
 */
export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
}

/**
 * Input parameters for voice generation
 */
export interface GenerateVoiceInput {
  /** The text to convert to speech */
  text: string
  /** Tone preset (selects appropriate voice) */
  tone?: VoiceTone
  /** Override with specific voice ID (must be validated) */
  voiceId?: string
  /** Custom voice settings (optional, only if supported) */
  settings?: Partial<VoiceSettings>
}

/**
 * Voice generation result
 */
export interface VoiceResult {
  audioBuffer: Buffer
  contentType: string
  estimatedDuration: number
  voiceName: string
  voiceId: string
  modelUsed: string
}

/**
 * Raw API response from /v1/voices
 */
interface ElevenLabsVoice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  settings?: any
}

// ============================================================================
// Constants
// ============================================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

/**
 * Safe default model - works with all voices
 */
const DEFAULT_MODEL = 'eleven_multilingual_v2'

/**
 * Minimum acceptable audio buffer size (bytes)
 * Anything below this is considered a failed generation
 */
const MIN_AUDIO_BUFFER_SIZE = 1000

/**
 * Input validation constraints
 */
const INPUT_CONSTRAINTS = {
  minTextLength: 3,
  maxTextLength: 5000,
  maxCacheAge: 5 * 60 * 1000, // 5 minutes
}

/**
 * Tone to voice ID mapping (fallback if API fails)
 * These will be validated against actual available voices
 */
const TONE_FALLBACK_MAP: Record<VoiceTone, string> = {
  motivational: 'pNInz6obpgDQGcFmaJgB', // Adam (pre-made voice)
  energetic: 'ErXwobaYiN019PkySvjV',    // Antoni (pre-made voice)
  narrative: 'TxGEqnHWrfWFTfGW9XjX',    // Josh (pre-made voice)
  professional: '21m00Tcm4TlvDq8ikWAM', // Rachel (pre-made voice)
  calm: 'EXAVITQu4vr4xnSDxMaL',         // Bella (pre-made voice)
}

/**
 * Fallback voice profiles when API voice listing is not available
 * These are ElevenLabs pre-made voices that should always work
 */
const FALLBACK_VOICE_PROFILES: VoiceProfile[] = [
  {
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    category: 'premade',
    supportsStyle: false,
    supportsSpeakerBoost: false,
    recommendedModel: DEFAULT_MODEL,
  },
  {
    voiceId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    category: 'premade',
    supportsStyle: false,
    supportsSpeakerBoost: false,
    recommendedModel: DEFAULT_MODEL,
  },
  {
    voiceId: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    category: 'premade',
    supportsStyle: false,
    supportsSpeakerBoost: false,
    recommendedModel: DEFAULT_MODEL,
  },
  {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    category: 'premade',
    supportsStyle: false,
    supportsSpeakerBoost: false,
    recommendedModel: DEFAULT_MODEL,
  },
  {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'premade',
    supportsStyle: false,
    supportsSpeakerBoost: false,
    recommendedModel: DEFAULT_MODEL,
  },
]

/**
 * Base voice settings (conservative defaults)
 */
const BASE_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
}

// ============================================================================
// Cache Layer
// ============================================================================

let voiceCacheData: VoiceProfile[] | null = null
let voiceCacheTimestamp: number = 0

/**
 * Clear the voice cache (useful for testing or forced refresh)
 */
export function clearVoiceCache(): void {
  voiceCacheData = null
  voiceCacheTimestamp = 0
  console.log('[Voice] Cache cleared')
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get and validate the ElevenLabs API key
 * @throws Error if API key is not configured or invalid format
 */
function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      'ELEVENLABS_API_KEY is not configured. ' +
      'Add it to your .env.local file.'
    )
  }

  if (apiKey.length < 20) {
    throw new Error(
      'ELEVENLABS_API_KEY appears invalid (too short). ' +
      'Please verify your API key.'
    )
  }

  return apiKey
}

/**
 * Check if voice cache is still valid
 */
function isCacheValid(): boolean {
  if (!voiceCacheData || voiceCacheData.length === 0) {
    return false
  }

  const cacheAge = Date.now() - voiceCacheTimestamp
  return cacheAge < INPUT_CONSTRAINTS.maxCacheAge
}

/**
 * Estimate audio duration based on text length
 * Average speaking rate: ~150 words per minute
 */
function estimateDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length
  const wordsPerSecond = 150 / 60 // 2.5 words/sec
  return Math.ceil(wordCount / wordsPerSecond)
}

/**
 * Sanitize and validate input text
 * @throws Error if text is invalid
 */
function validateAndSanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string')
  }

  const sanitized = text.trim()

  if (sanitized.length < INPUT_CONSTRAINTS.minTextLength) {
    throw new Error(
      `Text too short (min ${INPUT_CONSTRAINTS.minTextLength} characters). ` +
      `Provided: ${sanitized.length}`
    )
  }

  if (sanitized.length > INPUT_CONSTRAINTS.maxTextLength) {
    throw new Error(
      `Text too long (max ${INPUT_CONSTRAINTS.maxTextLength} characters). ` +
      `Provided: ${sanitized.length}. Consider breaking into smaller chunks.`
    )
  }

  return sanitized
}

/**
 * Build a safe voice profile from API response
 */
function buildVoiceProfile(voice: ElevenLabsVoice): VoiceProfile {
  // Conservative approach: assume no advanced features unless proven
  return {
    voiceId: voice.voice_id,
    name: voice.name,
    category: voice.category,
    labels: voice.labels,
    // Only enable style if explicitly supported
    supportsStyle: voice.settings?.style !== undefined,
    // Only enable speaker boost if explicitly supported
    supportsSpeakerBoost: voice.settings?.use_speaker_boost !== undefined,
    // Always use multilingual model for maximum compatibility
    recommendedModel: DEFAULT_MODEL,
  }
}

// ============================================================================
// Voice Validation Layer
// ============================================================================

/**
 * Fetch available voices from ElevenLabs API with validation
 * Results are cached for performance
 * 
 * Falls back to pre-made voice profiles if API key lacks voices_read permission
 * 
 * @throws Error only if API key is completely invalid
 */
export async function fetchAvailableVoices(): Promise<VoiceProfile[]> {
  // Return cached data if still valid
  if (isCacheValid() && voiceCacheData !== null) {
    console.log('[Voice] Using cached voice list')
    return voiceCacheData
  }

  console.log('[Voice] Fetching voice list from API...')
  const apiKey = getApiKey()

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Check if it's a permission error (voices_read missing)
      if (response.status === 401 && errorText.includes('missing_permissions')) {
        console.warn('[Voice] API key lacks voices_read permission')
        console.warn('[Voice] Falling back to pre-made voice profiles')
        
        // Cache the fallback profiles
        voiceCacheData = FALLBACK_VOICE_PROFILES
        voiceCacheTimestamp = Date.now()
        
        return FALLBACK_VOICE_PROFILES
      }
      
      // For other 401 errors, the key is completely invalid
      if (response.status === 401) {
        throw new Error(
          'Authentication failed. Your ELEVENLABS_API_KEY is invalid or expired. ' +
          'Please verify at https://elevenlabs.io/app/settings/api-keys'
        )
      }
      
      throw new Error(
        `Failed to fetch voices (${response.status}): ${errorText}`
      )
    }

    const data = await response.json()

    if (!data.voices || !Array.isArray(data.voices)) {
      throw new Error('Invalid response format from ElevenLabs API')
    }

    if (data.voices.length === 0) {
      console.warn('[Voice] No voices returned from API, using fallback profiles')
      voiceCacheData = FALLBACK_VOICE_PROFILES
      voiceCacheTimestamp = Date.now()
      return FALLBACK_VOICE_PROFILES
    }

    // Build validated voice profiles
    const profiles = data.voices.map(buildVoiceProfile)
    voiceCacheData = profiles
    voiceCacheTimestamp = Date.now()

    console.log(`[Voice] Fetched ${profiles.length} voices successfully`)
    return profiles

  } catch (error) {
    // If we already have fallback profiles, use them and log warning
    if (error instanceof Error && error.message.includes('Authentication failed')) {
      // Re-throw authentication errors - these are fatal
      console.error('[Voice] Failed to fetch voices:', error)
      throw error
    }
    
    // For network or other errors, use fallback
    console.warn('[Voice] Failed to fetch voices, using fallback profiles:', error)
    voiceCacheData = FALLBACK_VOICE_PROFILES
    voiceCacheTimestamp = Date.now()
    return FALLBACK_VOICE_PROFILES
  }
}

/**
 * Validate that a voice ID exists and is usable
 * 
 * @throws Error if voice ID is invalid or not found
 */
async function validateVoiceId(voiceId: string): Promise<VoiceProfile> {
  const voices = await fetchAvailableVoices()

  const voice = voices.find(v => v.voiceId === voiceId)

  if (!voice) {
    throw new Error(
      `Invalid voice ID: "${voiceId}". ` +
      `Available voices: ${voices.map(v => `${v.name} (${v.voiceId})`).join(', ')}`
    )
  }

  return voice
}

/**
 * Select appropriate voice based on tone
 * Falls back to first available voice if tone mapping fails
 */
async function selectVoiceByTone(tone: VoiceTone): Promise<VoiceProfile> {
  const voices = await fetchAvailableVoices()

  // Try to find voice by fallback mapping
  const fallbackVoiceId = TONE_FALLBACK_MAP[tone]
  if (fallbackVoiceId) {
    const voice = voices.find(v => v.voiceId === fallbackVoiceId)
    if (voice) {
      console.log(`[Voice] Selected voice for tone "${tone}": ${voice.name} (${voice.voiceId})`)
      return voice
    }
  }

  // Fallback: use first available voice
  console.warn(
    `[Voice] No voice found for tone "${tone}", using first available: ${voices[0].name}`
  )
  return voices[0]
}

// ============================================================================
// Voice Generation
// ============================================================================

/**
 * Build safe request body based on voice capabilities
 */
function buildRequestBody(
  text: string,
  voice: VoiceProfile,
  customSettings?: Partial<VoiceSettings>
): Record<string, any> {
  const body: Record<string, any> = {
    text,
    model_id: voice.recommendedModel,
  }

  // Only include voice_settings if voice supports customization
  if (voice.supportsStyle || voice.supportsSpeakerBoost) {
    const settings: VoiceSettings = {
      ...BASE_VOICE_SETTINGS,
      ...customSettings,
    }

    // Build settings object with only supported features
    const voiceSettings: Record<string, any> = {
      stability: settings.stability,
      similarity_boost: settings.similarity_boost,
    }

    if (voice.supportsStyle && settings.style !== undefined) {
      voiceSettings.style = settings.style
    }

    if (voice.supportsSpeakerBoost && settings.use_speaker_boost !== undefined) {
      voiceSettings.use_speaker_boost = settings.use_speaker_boost
    }

    body.voice_settings = voiceSettings
  }

  return body
}

/**
 * Validate audio buffer to prevent silent failures
 * @throws Error if buffer is invalid or too small
 */
function validateAudioBuffer(buffer: Buffer): void {
  if (!buffer || !(buffer instanceof Buffer)) {
    throw new Error('Invalid audio buffer received from API')
  }

  if (buffer.length < MIN_AUDIO_BUFFER_SIZE) {
    throw new Error(
      `Audio buffer too small (${buffer.length} bytes). ` +
      `Expected at least ${MIN_AUDIO_BUFFER_SIZE} bytes. ` +
      `This may indicate a failed generation.`
    )
  }
}

/**
 * Generate voice-over audio with full validation and error handling
 * 
 * This is the main public API - use this function for all TTS generation
 * 
 * @param input - Generation parameters (text, tone, or voiceId)
 * @returns Promise<VoiceResult> - Audio buffer and metadata
 * 
 * @throws Error with descriptive message if generation fails
 * 
 * @example
 * ```typescript
 * // Generate with tone preset
 * const result = await generateVoice({
 *   text: "Transform your life with these habits!",
 *   tone: "motivational"
 * });
 * 
 * // Generate with specific voice ID
 * const result = await generateVoice({
 *   text: "Welcome to our podcast",
 *   voiceId: "21m00Tcm4TlvDq8ikWAM"
 * });
 * ```
 */
export async function generateVoice(input: GenerateVoiceInput): Promise<VoiceResult> {
  console.log('[Voice] Starting generation...')

  try {
    // Step 1: Validate and sanitize input text
    const sanitizedText = validateAndSanitizeText(input.text)
    console.log(`[Voice] Text validated: ${sanitizedText.length} characters`)

    // Step 2: Select and validate voice
    let voice: VoiceProfile

    if (input.voiceId) {
      // Validate provided voice ID
      console.log(`[Voice] Validating provided voice ID: ${input.voiceId}`)
      voice = await validateVoiceId(input.voiceId)
    } else if (input.tone) {
      // Select voice by tone
      console.log(`[Voice] Selecting voice for tone: ${input.tone}`)
      voice = await selectVoiceByTone(input.tone)
    } else {
      // Default to motivational
      console.log('[Voice] No tone or voiceId provided, using default (motivational)')
      voice = await selectVoiceByTone('motivational')
    }

    console.log(`[Voice] Using voice: ${voice.name} (${voice.voiceId})`)
    console.log(`[Voice] Model: ${voice.recommendedModel}`)
    console.log(`[Voice] Features - Style: ${voice.supportsStyle}, SpeakerBoost: ${voice.supportsSpeakerBoost}`)

    // Step 3: Build safe request body
    const requestBody = buildRequestBody(sanitizedText, voice, input.settings)

    // Step 4: Get API key
    const apiKey = getApiKey()

    // Step 5: Make API request
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${voice.voiceId}`
    console.log(`[Voice] Calling API: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    // Step 6: Handle errors with detailed information
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Voice] API error (${response.status}):`, errorText)

      let errorDetail = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetail = errorJson.detail?.message 
          || errorJson.detail 
          || errorJson.message 
          || errorJson.error
          || errorText
      } catch {
        // errorText is not JSON, use as-is
      }

      // Provide specific error messages
      if (response.status === 401) {
        throw new Error(
          'Authentication failed. Your ELEVENLABS_API_KEY is invalid or expired. ' +
          'Please check your API key at https://elevenlabs.io/'
        )
      }

      if (response.status === 429) {
        throw new Error(
          'Rate limit exceeded. You have made too many requests. ' +
          'Please wait a moment or upgrade your ElevenLabs plan.'
        )
      }

      if (response.status === 400) {
        throw new Error(
          `Bad request (${response.status}): ${errorDetail}. ` +
          'This may indicate content policy violation or invalid voice settings.'
        )
      }

      if (response.status === 422) {
        throw new Error(
          `Validation error (${response.status}): ${errorDetail}. ` +
          'The text may contain unsupported characters or be too long.'
        )
      }

      throw new Error(
        `ElevenLabs API error (${response.status}): ${errorDetail}`
      )
    }

    // Step 7: Extract and validate audio buffer
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    console.log(`[Voice] Received audio buffer: ${audioBuffer.length} bytes`)
    validateAudioBuffer(audioBuffer)

    // Step 8: Calculate duration
    const estimatedDuration = estimateDuration(sanitizedText)

    console.log('[Voice] Generation successful')
    console.log(`[Voice] Duration: ~${estimatedDuration}s`)

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      estimatedDuration,
      voiceName: voice.name,
      voiceId: voice.voiceId,
      modelUsed: voice.recommendedModel,
    }

  } catch (error) {
    // Log error without exposing API key
    if (error instanceof Error) {
      console.error(`[Voice] Generation failed: ${error.message}`)
      throw error
    }

    console.error('[Voice] Unknown error during generation:', error)
    throw new Error('Voice generation failed with an unknown error')
  }
}

/**
 * Generate voice-over and save to file (Node.js only)
 * 
 * @param input - Generation parameters
 * @param outputPath - Path to save the MP3 file
 * @returns Promise<string> - Path to the saved file
 */
export async function generateVoiceToFile(
  input: GenerateVoiceInput,
  outputPath: string
): Promise<string> {
  const result = await generateVoice(input)

  // Dynamic import for Node.js fs module
  const fs = await import('fs/promises')
  await fs.writeFile(outputPath, result.audioBuffer)

  console.log(`[Voice] Saved audio to: ${outputPath}`)
  return outputPath
}

/**
 * Get list of all available voices with their capabilities
 * Useful for building UI selection interfaces
 */
export async function getAvailableVoices(): Promise<VoiceProfile[]> {
  return fetchAvailableVoices()
}

/**
 * Legacy compatibility - export tone mappings
 * @deprecated Use the new generateVoice() API with tone parameter instead
 */
export const VOICE_IDS = TONE_FALLBACK_MAP

/**
 * Legacy compatibility - export for external use
 * @deprecated Use VoiceTone type instead
 */
export type Tone = VoiceTone
