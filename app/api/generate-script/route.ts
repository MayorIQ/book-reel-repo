import { NextRequest, NextResponse } from 'next/server'
import { generateScriptWithFallback, generateCapCutScriptWithFallback } from '@/lib/script-generator'

type Tone = 'Motivational' | 'Emotional' | 'Educational' | 'Aggressive' | 'Calm'

interface GenerateScriptRequest {
  title: string
  description: string
  tone: Tone
  duration: number
  capcut?: boolean // Optional: use CapCut-optimized format (short punchy lines)
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: GenerateScriptRequest
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

    const { title, description, tone, duration, capcut = false } = body

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

    if (!['Motivational', 'Emotional', 'Educational', 'Aggressive', 'Calm'].includes(tone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tone',
        },
        { status: 400 }
      )
    }

    if (![30, 45, 60].includes(duration)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid duration',
        },
        { status: 400 }
      )
    }

    // Generate script (CapCut-optimized or standard)
    const scriptType = capcut ? 'CapCut-optimized' : 'Standard'
    console.log(`[Generate Script] Starting ${scriptType} script generation...`)
    
    const result = capcut 
      ? await generateCapCutScriptWithFallback({
          title,
          description,
          tone,
          duration,
        })
      : await generateScriptWithFallback({
          title,
          description,
          tone,
          duration,
        })

    console.log(`[Generate Script] ${scriptType} script generated successfully`)
    return NextResponse.json({
      success: true,
      script: result.script,
      keywords: result.keywords,
      format: capcut ? 'capcut' : 'standard',
      source: result.script.includes('[AI Generated]') ? 'OpenAI GPT-4' : 'Template',
    })
  } catch (error) {
    console.error('[Generate Script] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate script',
        details: errorMessage,
        suggestion: 'Please try again or check your API configuration.',
      },
      { status: 500 }
    )
  }
}

