/**
 * Storyboard Generation Utility
 * 
 * Generates visual scene descriptions optimized for stock footage sourcing.
 * Creates 6-10 scenes with generic, copyright-free descriptions.
 * 
 * Key Features:
 * - Matches motivational tone
 * - Stock footage friendly (Pexels, Unsplash)
 * - No copyrighted characters or brands
 * - Searchable visual descriptions
 */

import OpenAI from 'openai'

interface StoryboardScene {
  sceneNumber: number
  timestamp: string
  description: string
  stockSearchTerms: string[] // Keywords for stock footage search
  visualNotes: string
  duration: number
}

interface GenerateStoryboardInput {
  title: string
  description: string
  script: string
  tone: string
  duration: number
  sceneCount?: number
}

/**
 * Generate storyboard using OpenAI (with fallback to template)
 */
export async function generateStoryboard(input: GenerateStoryboardInput): Promise<string> {
  const { title, description, script, tone, duration, sceneCount = 8 } = input

  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateStoryboardWithAI(input)
    } catch (error) {
      console.warn('[Storyboard] OpenAI generation failed, using template fallback:', error)
    }
  }

  // Fallback to template-based generation
  return generateStoryboardTemplate(input)
}

/**
 * Generate storyboard with OpenAI
 */
async function generateStoryboardWithAI(input: GenerateStoryboardInput): Promise<string> {
  const { title, description, script, tone, duration, sceneCount = 8 } = input

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = `Create a storyboard with ${sceneCount} visual scenes for a ${duration}-second motivational video about "${title}".

Script: "${script}"

Tone: ${tone}
Description: ${description}

CRITICAL REQUIREMENTS:
✓ Each scene MUST use generic, stock footage-friendly descriptions
✓ NO copyrighted characters, brands, or logos
✓ Use searchable terms like "person climbing mountain", "sunrise over ocean", "hands holding plant"
✓ Focus on universal, relatable visuals
✓ Optimize for Pexels/Unsplash search terms

For each scene, provide:
1. Scene number
2. Timestamp (format: 00:00-00:05)
3. Generic visual description (stock footage friendly)
4. Stock search terms (3-5 keywords for finding footage)
5. Shot notes (camera angles, text overlays)

Make it engaging, visual, and optimized for short-form video (TikTok/Reels/Shorts).

Format each scene as:
SCENE [number]: [timestamp]
VISUAL: [generic stock-friendly description]
STOCK SEARCH: [keyword1, keyword2, keyword3]
NOTES: [shot notes]
---`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a professional video storyboard artist specializing in stock footage sourcing. You create generic, copyright-free visual descriptions optimized for stock video platforms.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  })

  const storyboard = response.choices[0]?.message?.content || ''
  
  if (!storyboard || storyboard.length < 50) {
    throw new Error('OpenAI returned invalid storyboard')
  }

  return formatStoryboard(title, description, tone, duration, storyboard)
}

/**
 * Generate storyboard with template (fallback)
 * Uses pre-defined stock footage descriptions
 */
function generateStoryboardTemplate(input: GenerateStoryboardInput): Promise<string> {
  const { title, description, script, tone, duration, sceneCount = 8 } = input

  // Split script into roughly equal parts
  const sentences = script.split(/[.!?\n]+/).filter(s => s.trim().length > 0)
  const scenesToCreate = Math.min(sceneCount, sentences.length)
  
  const scenes: StoryboardScene[] = []
  const sceneDuration = duration / scenesToCreate

  for (let i = 0; i < scenesToCreate; i++) {
    const sceneText = sentences[i] || sentences[sentences.length - 1]
    
    const startTime = i * sceneDuration
    const endTime = (i + 1) * sceneDuration
    const timestamp = formatTimestamp(startTime, endTime)

    const sceneInfo = generateSceneDescription(sceneText, tone, i, scenesToCreate)

    scenes.push({
      sceneNumber: i + 1,
      timestamp,
      description: sceneInfo.description,
      stockSearchTerms: sceneInfo.searchTerms,
      visualNotes: generateVisualNotes(tone, i, scenesToCreate),
      duration: sceneDuration,
    })
  }

  return Promise.resolve(formatStoryboardFromScenes(title, description, tone, duration, scenes))
}

/**
 * Stock footage descriptions optimized for motivational content
 * All descriptions are generic, copyright-free, and searchable
 */
const STOCK_FOOTAGE_LIBRARY: Record<string, Array<{
  description: string
  searchTerms: string[]
}>> = {
  motivational: [
    {
      description: 'Person climbing rocky mountain at sunrise, reaching summit',
      searchTerms: ['mountain climbing', 'sunrise peak', 'achievement', 'success'],
    },
    {
      description: 'Runner sprinting on track in slow motion, determination visible',
      searchTerms: ['running motivation', 'athlete training', 'determination', 'sprint'],
    },
    {
      description: 'Hands planting small tree seedling in soil, growth concept',
      searchTerms: ['planting tree', 'growth', 'new beginning', 'nature'],
    },
    {
      description: 'Person standing on cliff edge facing ocean at golden hour',
      searchTerms: ['cliff ocean', 'contemplation', 'freedom', 'adventure'],
    },
    {
      description: 'Close-up of person writing goals in journal, morning light',
      searchTerms: ['writing journal', 'planning', 'goals', 'productivity'],
    },
    {
      description: 'Aerial view of winding road through mountains, journey concept',
      searchTerms: ['mountain road', 'journey', 'path', 'adventure aerial'],
    },
    {
      description: 'Person doing push-ups outdoors, fitness and discipline',
      searchTerms: ['fitness training', 'push ups', 'workout motivation', 'discipline'],
    },
    {
      description: 'Time-lapse of sunrise over city skyline, new day beginning',
      searchTerms: ['city sunrise', 'new day', 'urban dawn', 'fresh start'],
    },
    {
      description: 'Hands holding open book with highlights, learning and growth',
      searchTerms: ['reading book', 'learning', 'education', 'knowledge'],
    },
    {
      description: 'Person meditating on mountain top, peace and clarity',
      searchTerms: ['mountain meditation', 'mindfulness', 'zen', 'peace'],
    },
  ],
  calm: [
    {
      description: 'Gentle ocean waves lapping on sandy beach, peaceful rhythm',
      searchTerms: ['ocean waves', 'beach calm', 'peaceful water', 'serene'],
    },
    {
      description: 'Rain droplets on window glass with blurred background',
      searchTerms: ['rain window', 'peaceful rain', 'water drops', 'calm'],
    },
    {
      description: 'Zen garden with raked sand patterns, minimalist peace',
      searchTerms: ['zen garden', 'sand pattern', 'meditation', 'minimalist'],
    },
    {
      description: 'Floating lotus flower on still water surface',
      searchTerms: ['lotus flower', 'calm water', 'peaceful', 'zen'],
    },
  ],
  emotional: [
    {
      description: 'Parent and child holding hands walking at sunset',
      searchTerms: ['family sunset', 'holding hands', 'connection', 'love'],
    },
    {
      description: 'Person hugging loved one, emotional embrace',
      searchTerms: ['hugging', 'embrace', 'emotional', 'connection'],
    },
  ],
  educational: [
    {
      description: 'Stack of books on wooden desk with reading glasses',
      searchTerms: ['books desk', 'study', 'learning', 'education'],
    },
    {
      description: 'Person taking notes while reading, focused learning',
      searchTerms: ['taking notes', 'studying', 'learning', 'focus'],
    },
  ],
  aggressive: [
    {
      description: 'Athlete lifting heavy weights, maximum effort',
      searchTerms: ['weightlifting', 'strength training', 'power', 'gym'],
    },
    {
      description: 'Boxing gloves hitting punching bag with force',
      searchTerms: ['boxing training', 'punching bag', 'power', 'combat'],
    },
  ],
}

/**
 * Generate scene description based on text and position
 * Optimized for stock footage sourcing
 */
function generateSceneDescription(
  text: string,
  tone: string,
  index: number,
  total: number
): { description: string; searchTerms: string[] } {
  const isOpening = index === 0
  const isClosing = index === total - 1

  // Get tone-specific library or default to motivational
  const toneKey = tone.toLowerCase()
  const library = STOCK_FOOTAGE_LIBRARY[toneKey] || STOCK_FOOTAGE_LIBRARY.motivational
  
  // Select scene based on position
  const sceneIndex = index % library.length
  const scene = library[sceneIndex]

  if (isOpening) {
    return {
      description: `OPENING HOOK: ${scene.description}. Bold text overlay appears: "${text.substring(0, 40)}..."`,
      searchTerms: [...scene.searchTerms, 'cinematic opening'],
    }
  } else if (isClosing) {
    return {
      description: `CLOSING CTA: ${scene.description}. Strong call-to-action text overlay with follow button`,
      searchTerms: [...scene.searchTerms, 'inspirational ending'],
    }
  } else {
    return {
      description: `${scene.description}. Caption overlay: "${text.substring(0, 50)}..."`,
      searchTerms: scene.searchTerms,
    }
  }
}

/**
 * Generate visual notes for camera and editing
 */
function generateVisualNotes(tone: string, index: number, total: number): string {
  const isOpening = index === 0
  const isClosing = index === total - 1

  if (isOpening) {
    return 'Hook shot - grab attention immediately. Use bold text, quick zoom. Keep text readable for 2-3 seconds.'
  } else if (isClosing) {
    return 'CTA shot - end with strong message. Add follow button prompt, website link, or next action.'
  } else {
    const notes = [
      'Smooth transition from previous scene. Text overlay with key message.',
      'Medium shot with dynamic text animation. Keep visuals engaging.',
      'Close-up with emphasis on emotional beat. Sync text with voiceover.',
      'Wide shot establishing context. Use split-screen if needed for multiple points.',
      'B-roll footage supporting the narrative. Overlay statistics or quotes.',
    ]
    return notes[index % notes.length]
  }
}

/**
 * Format timestamp as MM:SS-MM:SS
 */
function formatTimestamp(startSeconds: number, endSeconds: number): string {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${formatTime(startSeconds)}-${formatTime(endSeconds)}`
}

/**
 * Format storyboard as readable text file
 */
function formatStoryboard(
  title: string,
  description: string,
  tone: string,
  duration: number,
  content: string
): string {
  return `╔═══════════════════════════════════════════════════════════════════╗
║                      VIDEO STORYBOARD                             ║
║                 Stock Footage Optimized                           ║
╚═══════════════════════════════════════════════════════════════════╝

PROJECT: ${title}
DESCRIPTION: ${description}
TONE: ${tone}
DURATION: ${duration} seconds
FORMAT: Vertical (9:16) for TikTok/Reels/Shorts

Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCENES:

${content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STOCK FOOTAGE SOURCING GUIDE:

🎬 WHERE TO FIND FOOTAGE:
• Pexels Videos (https://www.pexels.com/videos/) - FREE
• Pixabay Videos (https://pixabay.com/videos/) - FREE
• Unsplash (https://unsplash.com/) - FREE photos
• Coverr (https://coverr.co/) - FREE video loops
• Videvo (https://www.videvo.net/) - FREE & paid

🔍 SEARCH TIPS:
• Use the "STOCK SEARCH" keywords provided for each scene
• Filter by: Vertical/Portrait orientation (9:16)
• Look for: High resolution (1080p minimum)
• Avoid: Logos, brands, copyrighted content
• Prefer: Generic, relatable visuals

✅ COPYRIGHT-FREE GUIDELINES:
• All scenes use generic descriptions
• No specific brands, characters, or logos
• Safe for commercial use
• Attribution not required (but appreciated)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCTION NOTES:

📱 MOBILE OPTIMIZATION:
• Keep text large and readable (minimum 60pt font)
• Use high contrast for captions (white text on dark bg)
• Position text in center "safe zone"
• Test on actual phone screen

🎨 VISUAL STYLE:
• Maintain consistent color grading across clips
• Use smooth transitions (0.5-1 second)
• Add subtle zoom/pan to static footage
• Match clip energy to voiceover tone

⏱️ TIMING:
• Sync scene changes with script sentences
• Keep each scene 3-4 seconds minimum
• Match visual intensity to audio peaks
• Allow 0.5s overlap for smooth transitions

📝 CAPTIONS:
• Add from included SRT subtitle file
• Position: Lower third or center
• Style: Bold, sans-serif font
• Animation: Fade in/out or word-by-word

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDED EDITING SOFTWARE:

🥇 CapCut (Best for beginners)
   • Mobile & Desktop versions
   • Free stock footage library built-in
   • Auto-captions feature
   • Templates for vertical video

💎 Adobe Premiere Rush
   • Professional quality
   • Cloud sync across devices
   • Motion graphics templates

🎬 DaVinci Resolve (Advanced)
   • Free full-featured version
   • Professional color grading
   • Best for custom effects

📱 InShot (Mobile-only)
   • Quick edits on phone
   • Easy text overlays
   • Music library included

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXPORT SETTINGS:

Resolution: 1080x1920 (9:16 vertical)
Frame Rate: 30fps or 60fps
Bitrate: 10-15 Mbps
Format: MP4 (H.264)
Audio: AAC 128-192 kbps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ READY TO CREATE YOUR VIDEO!

All scenes are optimized for stock footage sourcing.
Use the provided search terms to find perfect clips.
No copyright issues - all descriptions are generic.

Happy editing! 🎥

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
}

/**
 * Format storyboard from scene objects
 */
function formatStoryboardFromScenes(
  title: string,
  description: string,
  tone: string,
  duration: number,
  scenes: StoryboardScene[]
): string {
  const sceneContent = scenes
    .map(scene => {
      return `SCENE ${scene.sceneNumber}: ${scene.timestamp}
VISUAL: ${scene.description}
STOCK SEARCH: ${scene.stockSearchTerms.join(', ')}
NOTES: ${scene.visualNotes}
---`
    })
    .join('\n\n')

  return formatStoryboard(title, description, tone, duration, sceneContent)
}

