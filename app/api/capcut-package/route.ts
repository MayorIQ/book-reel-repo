import { NextRequest, NextResponse } from 'next/server'
import archiver from 'archiver'
import { Readable } from 'stream'
import { generateSubtitles } from '@/lib/subtitle-generator'
import { generateStoryboard } from '@/lib/storyboard-generator'

interface CapCutPackageRequest {
  title: string
  description: string
  tone: string
  duration: string | number
  script: string
  voiceAudio: string // Base64 encoded
}

/**
 * API Route: Create CapCut Package
 * 
 * POST /api/capcut-package
 * 
 * Creates a complete package for CapCut video editing including:
 * - Voiceover audio file (MP3)
 * - Subtitle file (SRT)
 * - Storyboard document (TXT)
 * - README instructions
 * 
 * Returns: ZIP file download
 */
export async function POST(request: NextRequest) {
  console.log('[CapCut Package] Starting package creation...')
  
  try {
    // Parse request body
    let body: CapCutPackageRequest
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

    const { title, description, tone, duration, script, voiceAudio } = body

    // Validate inputs
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!script?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Script is required' },
        { status: 400 }
      )
    }

    if (!voiceAudio) {
      return NextResponse.json(
        { success: false, error: 'Voice audio is required' },
        { status: 400 }
      )
    }

    const durationNum = typeof duration === 'string' ? parseInt(duration) : duration

    console.log('[CapCut Package] Input validated')
    console.log('[CapCut Package] Title:', title)
    console.log('[CapCut Package] Duration:', durationNum, 'seconds')
    console.log('[CapCut Package] Script length:', script.length, 'characters')

    // ========================================================================
    // Step 1: Prepare Audio File
    // ========================================================================
    console.log('[CapCut Package] Step 1: Preparing audio file...')
    
    let audioBuffer: Buffer
    try {
      // Decode base64 audio
      audioBuffer = Buffer.from(voiceAudio, 'base64')
      console.log('[CapCut Package] Audio decoded:', audioBuffer.length, 'bytes')
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid audio data',
          details: 'Failed to decode base64 audio',
        },
        { status: 400 }
      )
    }

    // ========================================================================
    // Step 2: Generate Subtitles (SRT)
    // ========================================================================
    console.log('[CapCut Package] Step 2: Generating subtitles...')
    
    let subtitles: string
    try {
      subtitles = generateSubtitles(script, durationNum)
      console.log('[CapCut Package] Subtitles generated successfully')
    } catch (error) {
      console.error('[CapCut Package] Subtitle generation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate subtitles',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    // ========================================================================
    // Step 3: Generate Storyboard
    // ========================================================================
    console.log('[CapCut Package] Step 3: Generating storyboard...')
    
    let storyboard: string
    try {
      storyboard = await generateStoryboard({
        title,
        description,
        script,
        tone,
        duration: durationNum,
        sceneCount: 8,
      })
      console.log('[CapCut Package] Storyboard generated successfully')
    } catch (error) {
      console.error('[CapCut Package] Storyboard generation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate storyboard',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    // ========================================================================
    // Step 4: Create Instructions
    // ========================================================================
    console.log('[CapCut Package] Step 4: Creating instructions...')
    
    const instructions = createInstructions(title, description, tone, durationNum, script)

    // ========================================================================
    // Step 5: Create ZIP Package
    // ========================================================================
    console.log('[CapCut Package] Step 5: Creating ZIP package...')
    
    try {
      // Create archive
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      })

      // Fixed filename
      const zipFilename = 'capcut_assets.zip'

      // Add files to archive with specific names
      archive.append(audioBuffer, { name: 'narration.mp3' })
      archive.append(subtitles, { name: 'captions.srt' })
      archive.append(storyboard, { name: 'storyboard.txt' })
      archive.append(instructions, { name: 'instructions.md' })

      // Finalize the archive
      await archive.finalize()

      console.log('[CapCut Package] ZIP package created successfully')
      console.log('[CapCut Package] Filename:', zipFilename)

      // Convert archive to buffer
      const chunks: Buffer[] = []
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      await new Promise<void>((resolve, reject) => {
        archive.on('end', () => resolve())
        archive.on('error', (err) => reject(err))
      })

      const zipBuffer = Buffer.concat(chunks)
      console.log('[CapCut Package] ZIP size:', zipBuffer.length, 'bytes')

      // Return ZIP file
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipFilename}"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      })

    } catch (error) {
      console.error('[CapCut Package] ZIP creation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create ZIP package',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[CapCut Package] Unexpected error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create CapCut package',
        details: errorMessage,
        suggestion: 'Please try again or contact support',
      },
      { status: 500 }
    )
  }
}

/**
 * Create instructions file in Markdown format
 */
function createInstructions(
  title: string,
  description: string,
  tone: string,
  duration: number,
  script: string
): string {
  return `# CapCut Video Package
## ${title}

---

## 📦 Package Contents

✅ **narration.mp3** - Professional AI voice-over audio  
✅ **captions.srt** - Timed subtitles/captions (SRT format)  
✅ **storyboard.txt** - Visual scene descriptions with stock search terms  
✅ **instructions.md** - This file

---

## 📋 Project Details

- **Title:** ${title}
- **Description:** ${description}
- **Tone:** ${tone}
- **Duration:** ${duration} seconds
- **Format:** Vertical (9:16) for social media
- **Script Length:** ${script.split(/\s+/).length} words

---

## 🎬 Quick Start Guide

### Step 1: Open CapCut
- Download CapCut from [capcut.com](https://www.capcut.com)
- Or use the mobile app (iOS/Android)
- Create a new project

### Step 2: Set Up Project
- Choose **9:16 aspect ratio** (Portrait/Vertical)
- Set duration to **${duration} seconds**
- Import **narration.mp3** to your timeline

### Step 3: Add Visuals
- Follow **storyboard.txt** for scene ideas and stock search terms
- Add stock footage from Pexels, Pixabay, or custom clips
- Match visuals to narration timing
- Use smooth transitions between scenes

### Step 4: Add Subtitles
- **Option 1:** Import **captions.srt** file
- **Option 2:** Use CapCut's auto-caption feature (faster)
- **Style:** Choose bold, readable fonts (60pt+)
- **Position:** Keep text in safe zone (center or lower third)
- **Animation:** Add pop-in effects for engagement

### Step 5: Enhance
- Add background music (20-30% volume)
- Apply color grading for consistent look
- Add text overlays for key points
- Include trending effects/transitions

### Step 6: Export
- **Resolution:** 1080x1920 (Full HD)
- **Frame Rate:** 30fps or 60fps
- **Quality:** High or Maximum
- **Format:** MP4

---

## 💡 Pro Tips

### ✨ Engagement Tips
- **Hook viewers in first 3 seconds** - Use bold visuals and text
- **Keep scenes dynamic** - Change every 3-5 seconds
- **Use captions** - 80% watch without sound
- **Add trending music** - For TikTok/Reels algorithm boost
- **Include call-to-action** - At the end (follow, like, comment)

### 🎨 Visual Tips
- Use **high-quality footage** (minimum 1080p)
- Match **color scheme to tone** (${tone})
- Keep **text large and legible** (mobile-first)
- Use **contrast** for better readability
- Avoid **cluttered compositions**

### 🔊 Audio Tips
- Keep **narration as primary audio** (clear and loud)
- **Background music** at 20-30% volume
- Use **sound effects sparingly**
- Ensure **voice is crystal clear**
- Add **subtle audio ducking** when needed

---

## 📱 Platform Optimization

### TikTok
- ✅ Max ${duration}s (perfect!)
- Use trending sounds/effects
- Add hashtags in caption
- Post at peak times (7-9pm local)

### Instagram Reels
- ✅ Max 90s (${duration}s is ideal)
- Use Reels-specific music
- Share to Stories too
- Use location tags

### YouTube Shorts
- ✅ Max 60s (trim if needed)
- Add #Shorts in title
- Include keywords
- Engage with comments quickly

---

## 🆘 Troubleshooting

### Audio Not Syncing?
- Check timeline is set to **${duration}s**
- Ensure narration starts at **00:00**
- Verify audio file imported correctly

### Subtitles Not Showing?
- Make sure **captions.srt** is imported correctly
- Use CapCut's auto-caption as backup
- Check subtitle timing in preview mode

### Video Too Long/Short?
- Speed up/slow down clips slightly (1.1x or 0.9x)
- Trim pauses in narration
- Adjust scene durations proportionally

### Quality Looks Bad?
- Export at **1080p minimum**
- Use high-quality source footage
- Check export settings (High quality)
- Avoid over-compressing

---

## 📚 Helpful Resources

- **CapCut Tutorials:** [youtube.com/@CapCutOfficial](https://youtube.com/@CapCutOfficial)
- **Stock Footage:** [pexels.com/videos](https://pexels.com/videos), [pixabay.com/videos](https://pixabay.com/videos)
- **Free Music:** [uppbeat.io](https://uppbeat.io), [epidemicsound.com](https://epidemicsound.com)
- **Font Inspiration:** [fonts.google.com](https://fonts.google.com)
- **Color Palettes:** [coolors.co](https://coolors.co)

---

## 📧 Support

For questions or issues with this package:
- Review **storyboard.txt** for visual guidance and stock search terms
- Check **captions.srt** for subtitle timing
- Ensure all files imported correctly into CapCut

---

**Generated:** ${new Date().toLocaleString()}  
**Version:** 2.0  
**Format:** CapCut Compatible  

🎉 **Ready to create amazing content! Good luck with your video!**
`
}
