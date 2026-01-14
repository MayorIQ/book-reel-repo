import { NextRequest, NextResponse } from 'next/server'
import { generateVoice, type VoiceTone } from '@/lib/voice'

/**
 * API tone mapping to voice tone presets
 */
type APITone = 'Motivational' | 'Emotional' | 'Educational' | 'Aggressive' | 'Calm'

interface GenerateVoiceoverRequest {
  script: string
  tone: APITone
}

/**
 * Map API tones to voice tone presets
 */
const apiToneToVoiceTone: Record<APITone, VoiceTone> = {
  Motivational: 'motivational',
  Emotional: 'calm',
  Educational: 'professional',
  Aggressive: 'energetic',
  Calm: 'calm',
}

/**
 * API Route: Generate voiceover using ElevenLabs TTS
 * 
 * POST /api/generate-voiceover
 * Body: { script: string, tone: APITone }
 * 
 * Returns: { success: true, audio: base64, ... } or error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: GenerateVoiceoverRequest
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

    const { script, tone } = body

    // Validate tone (validates before passing to voice generation)
    const validTones: APITone[] = ['Motivational', 'Emotional', 'Educational', 'Aggressive', 'Calm']
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tone',
          details: `Tone must be one of: ${validTones.join(', ')}`,
          suggestion: 'Use a valid tone value from the list',
        },
        { status: 400 }
      )
    }

    // Map API tone to voice tone
    const voiceTone = apiToneToVoiceTone[tone]

    console.log('[API] Generate Voiceover Request')
    console.log('[API] Tone:', tone, '→', voiceTone)
    console.log('[API] Script length:', script?.length || 0)

    // Generate voice using the refactored library
    // Note: The library now handles all validation, voice selection, and error handling
    const result = await generateVoice({
      text: script,
      tone: voiceTone,
    })

    console.log('[API] Generation successful')
    console.log('[API] Voice used:', result.voiceName, `(${result.voiceId})`)
    console.log('[API] Model used:', result.modelUsed)
    console.log('[API] Audio size:', result.audioBuffer.length, 'bytes')
    console.log('[API] Duration:', result.estimatedDuration, 'seconds')

    // Convert buffer to base64 for transmission
    const audioBase64 = result.audioBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      contentType: result.contentType,
      duration: result.estimatedDuration,
      voiceId: result.voiceId,
      voiceName: result.voiceName,
      modelUsed: result.modelUsed,
    })
  } catch (error) {
    console.error('[API] Voiceover generation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // The refactored library provides detailed error messages
    // We can pass them through with appropriate HTTP status codes
    
    if (errorMessage.includes('API key') || errorMessage.includes('Authentication')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          details: errorMessage,
          suggestion: 'Check your ELEVENLABS_API_KEY in .env.local',
        },
        { status: 401 }
      )
    }

    if (errorMessage.includes('Rate limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          details: errorMessage,
          suggestion: 'Wait a moment before trying again, or upgrade your plan',
        },
        { status: 429 }
      )
    }

    if (errorMessage.includes('Validation error') || errorMessage.includes('too short') || errorMessage.includes('too long')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Input validation failed',
          details: errorMessage,
          suggestion: 'Check that your script is between 3 and 5000 characters',
        },
        { status: 400 }
      )
    }

    if (errorMessage.includes('content policy') || errorMessage.includes('Bad request')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content validation failed',
          details: errorMessage,
          suggestion: 'Your script may violate content policies. Try rephrasing.',
        },
        { status: 400 }
      )
    }

    if (errorMessage.includes('Invalid voice ID')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Voice selection failed',
          details: errorMessage,
          suggestion: 'The requested voice is not available. Try a different tone.',
        },
        { status: 400 }
      )
    }

    // Generic error fallback
    return NextResponse.json(
      {
        success: false,
        error: 'Voice generation failed',
        details: errorMessage,
        suggestion: 'Please try again or contact support if the issue persists',
      },
      { status: 500 }
    )
  }
}
