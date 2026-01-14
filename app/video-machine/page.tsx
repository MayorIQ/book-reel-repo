'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSavedBooks } from '@/lib/saved-books-context'

// ============================================================================
// Types
// ============================================================================

type Tone = 'Motivational' | 'Emotional' | 'Educational' | 'Aggressive' | 'Calm'
type Duration = '30' | '45' | '60'
type Tab = 'script' | 'voice'
type ScriptMode = 'ai' | 'manual'
type VoiceMode = 'ai' | 'record'

interface VideoError {
  error: string
  step?: string
  code?: string
  details?: string
  suggestion?: string
}

// ============================================================================
// Data
// ============================================================================

const tones: { value: Tone; label: string; icon: string }[] = [
  { value: 'Motivational', label: 'Motivational', icon: '🔥' },
  { value: 'Emotional', label: 'Emotional', icon: '💖' },
  { value: 'Educational', label: 'Educational', icon: '📚' },
  { value: 'Aggressive', label: 'Aggressive', icon: '⚡' },
  { value: 'Calm', label: 'Calm', icon: '🧘' },
]

const durations: { value: Duration; label: string }[] = [
  { value: '30', label: '30 seconds' },
  { value: '45', label: '45 seconds' },
  { value: '60', label: '60 seconds' },
]

// ============================================================================
// Components
// ============================================================================

function Header() {
  const { savedBooks } = useSavedBooks()
  const savedCount = savedBooks.length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-warm-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-warm-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-xl text-white">BookReel</span>
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link href="/video-machine" className="inline-flex items-center gap-2 text-white font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Create Video
          </Link>
          <Link 
            href="/library" 
            className="relative inline-flex items-center gap-2 text-sand-300 hover:text-white transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            My Library
            {savedCount > 0 && (
              <span className="absolute -top-2 -right-3 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-warm-950 bg-gold-400 rounded-full">
                {savedCount > 9 ? '9+' : savedCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}

// ============================================================================
// Main Page
// ============================================================================

function VideoMachinePageContent() {
  const searchParams = useSearchParams()
  
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('script')
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tone, setTone] = useState<Tone>('Motivational')
  const [duration, setDuration] = useState<Duration>('30')
  
  // Script state
  const [scriptMode, setScriptMode] = useState<ScriptMode>('ai')
  const [generatedScript, setGeneratedScript] = useState('')
  const [manualScript, setManualScript] = useState('')
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [useCapCutMode, setUseCapCutMode] = useState(true) // Default to CapCut-optimized
  
  // Voice state
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('ai')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // CapCut state
  const [isCreatingCapCutPackage, setIsCreatingCapCutPackage] = useState(false)
  const [capCutPackageUrl, setCapCutPackageUrl] = useState<string | null>(null)
  
  // UI state
  const [error, setError] = useState<VideoError | null>(null)

  // Pre-fill from URL params
  useEffect(() => {
    const bookTitle = searchParams.get('title')
    const bookDescription = searchParams.get('description')
    
    if (bookTitle) setTitle(bookTitle)
    if (bookDescription) setDescription(bookDescription)
  }, [searchParams])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Generate script with AI
  const handleGenerateScript = async () => {
    if (!title.trim() || !description.trim()) {
      setError({ error: 'Please enter book title and description' })
      return
    }

    setIsGeneratingScript(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tone,
          duration: parseInt(duration),
          capcut: useCapCutMode,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError({
          error: data.error || 'Failed to generate script',
          details: data.details,
          suggestion: data.suggestion,
        })
        return
      }

      setGeneratedScript(data.script)
      setScriptMode('ai')
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : 'Failed to generate script',
        suggestion: 'Check your connection and try again.',
      })
    } finally {
      setIsGeneratingScript(false)
    }
  }

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      setError({
        error: 'Microphone access denied',
        suggestion: 'Please allow microphone access to record audio.',
      })
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Generate AI voiceover
  const handleGenerateVoiceover = async () => {
    const finalScript = scriptMode === 'ai' ? generatedScript : manualScript

    if (!finalScript.trim()) {
      setError({ error: 'Please generate or write a script first' })
      return
    }

    setIsGeneratingVoice(true)
    setError(null)
    setGeneratedAudioUrl(null)

    try {
      const response = await fetch('/api/generate-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: finalScript.trim(),
          tone,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError({
          error: data.error || 'Failed to generate voiceover',
          details: data.details,
          suggestion: data.suggestion,
        })
        return
      }

      // Convert base64 audio to blob and create URL
      const audioData = atob(data.audio)
      const audioArray = new Uint8Array(audioData.length)
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i)
      }
      const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      setGeneratedAudioUrl(audioUrl)
      setAudioBlob(audioBlob) // Store for future use
      console.log('[Voiceover] Generated audio duration:', data.duration, 'seconds')
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : 'Failed to generate voiceover',
        suggestion: 'Check your connection and try again.',
      })
    } finally {
      setIsGeneratingVoice(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Create CapCut package
  const handleCreateCapCutPackage = async () => {
    const finalScript = scriptMode === 'ai' ? generatedScript : manualScript

    if (!title.trim()) {
      setError({ error: 'Please enter a book title first' })
      return
    }

    if (!description.trim()) {
      setError({ error: 'Please enter a description first' })
      return
    }

    if (!finalScript.trim()) {
      setError({ error: 'Please generate or write a script first' })
      return
    }

    if (!audioBlob) {
      setError({ error: 'Please generate or record a voice-over first' })
      return
    }

    setIsCreatingCapCutPackage(true)
    setError(null)

    try {
      // Convert audio blob to base64
      const reader = new FileReader()
      const audioBase64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string
          resolve(base64.split(',')[1]) // Remove data URL prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      const voiceAudio = await audioBase64Promise

      console.log('[CapCut] Creating package...')
      console.log('[CapCut] Title:', title)
      console.log('[CapCut] Tone:', tone)
      console.log('[CapCut] Duration:', duration, 'seconds')

      const response = await fetch('/api/capcut-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tone: tone,
          duration: duration,
          script: finalScript.trim(),
          voiceAudio,
        }),
      })

      // Check if response is a ZIP file
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/zip')) {
        // Download the ZIP file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const filename = response.headers.get('content-disposition')
          ?.split('filename=')[1]
          ?.replace(/"/g, '') || 'capcut-package.zip'
        
        // Create download link
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        console.log('[CapCut] Package downloaded successfully:', filename)
        setCapCutPackageUrl('#downloaded') // Indicate success
      } else {
        // Handle JSON error response
        const data = await response.json()
        setError({
          error: data.error || 'Failed to create CapCut package',
          details: data.details,
          suggestion: data.suggestion,
        })
      }
    } catch (err) {
      setError({
        error: err instanceof Error ? err.message : 'Failed to create CapCut package',
        suggestion: 'Check your connection and try again.',
      })
    } finally {
      setIsCreatingCapCutPackage(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-950">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6">
            <span className="text-purple-400 text-sm font-semibold">🎬 AI Powered</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            AI Script & Voice Studio
          </h1>
          <p className="text-sand-400 text-lg max-w-2xl mx-auto">
            Generate professional scripts and voice-overs for your book content
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Basic Info Card */}
          <div className="mb-6 bg-gradient-to-br from-warm-900/90 to-warm-950/90 backdrop-blur-xl rounded-3xl border border-sand-800/30 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gold-400 mb-2">Book Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title..."
                  className="w-full px-4 py-3 bg-warm-950/80 border border-sand-700/50 rounded-xl text-white placeholder-sand-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gold-400 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="w-full px-4 py-3 bg-warm-950/80 border border-sand-700/50 rounded-xl text-white placeholder-sand-500 focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gold-400 mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="w-full px-4 py-3 bg-warm-950/80 border border-sand-700/50 rounded-xl text-white focus:outline-none focus:border-gold-500 cursor-pointer"
                >
                  {tones.map((t) => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gold-400 mb-2">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as Duration)}
                  className="w-full px-4 py-3 bg-warm-950/80 border border-sand-700/50 rounded-xl text-white focus:outline-none focus:border-gold-500 cursor-pointer"
                >
                  {durations.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('script')}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === 'script'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-warm-900/50 text-sand-400 hover:bg-warm-900'
              }`}
            >
              1. Script
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-warm-900/50 text-sand-400 hover:bg-warm-900'
              }`}
            >
              2. Voice-Over
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-red-400 font-semibold">{error.error}</p>
                  {error.suggestion && (
                    <p className="text-sand-300 text-sm mt-2">💡 {error.suggestion}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-gradient-to-br from-warm-900/90 to-warm-950/90 backdrop-blur-xl rounded-3xl border border-sand-800/30 p-8 min-h-[500px]">
            {/* SCRIPT TAB */}
            {activeTab === 'script' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Generate Script</h2>
                
                {/* Mode Selection */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setScriptMode('ai')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      scriptMode === 'ai'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-sand-700/50 hover:border-sand-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="font-bold text-white">AI Generated</div>
                    <div className="text-sm text-sand-400">Let AI write the script</div>
                  </button>
                  <button
                    onClick={() => setScriptMode('manual')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      scriptMode === 'manual'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-sand-700/50 hover:border-sand-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">✍️</div>
                    <div className="font-bold text-white">Manual Entry</div>
                    <div className="text-sm text-sand-400">Write your own script</div>
                  </button>
                </div>

                {/* AI Mode */}
                {scriptMode === 'ai' && (
                  <div>
                    {/* CapCut Mode Toggle */}
                    <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🎬</div>
                          <div>
                            <div className="text-white font-semibold">CapCut-Optimized Mode</div>
                            <div className="text-sand-400 text-sm">Short punchy lines, max 10 words per sentence</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setUseCapCutMode(!useCapCutMode)}
                          className={`relative w-14 h-8 rounded-full transition-colors ${
                            useCapCutMode ? 'bg-purple-500' : 'bg-sand-700'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                              useCapCutMode ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      {useCapCutMode && (
                        <div className="mt-3 pt-3 border-t border-purple-500/20">
                          <div className="text-xs text-sand-400 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400">✓</span>
                              <span>Perfect for TikTok, Reels, YouTube Shorts</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400">✓</span>
                              <span>Strong hook + clear emotional arc</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400">✓</span>
                              <span>Optimized for on-screen captions</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleGenerateScript}
                      disabled={isGeneratingScript}
                      className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed mb-4"
                    >
                      {isGeneratingScript ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating{useCapCutMode ? ' CapCut' : ''} Script...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate {useCapCutMode ? 'CapCut ' : ''}Script with AI
                        </>
                      )}
                    </button>
                    
                    {generatedScript && (
                      <div className="p-4 bg-warm-950/50 rounded-xl border border-sand-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gold-400 text-sm font-semibold">Generated Script</span>
                          <span className="text-sand-500 text-xs">{generatedScript.split(/\s+/).length} words</span>
                        </div>
                        <p className="text-white leading-relaxed">{generatedScript}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Mode */}
                {scriptMode === 'manual' && (
                  <div>
                    <label className="block text-sm font-semibold text-gold-400 mb-2">Your Script</label>
                    <textarea
                      value={manualScript}
                      onChange={(e) => setManualScript(e.target.value)}
                      placeholder="Write your video script here..."
                      rows={12}
                      className="w-full px-4 py-3 bg-warm-950/80 border border-sand-700/50 rounded-xl text-white placeholder-sand-500 focus:outline-none focus:border-gold-500 resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sand-500 text-sm">{manualScript.split(/\s+/).filter(w => w).length} words</span>
                      <span className="text-sand-500 text-sm">~{Math.ceil(manualScript.split(/\s+/).filter(w => w).length / 2.5)}s reading time</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('voice')}
                  disabled={scriptMode === 'ai' ? !generatedScript : !manualScript}
                  className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-gold-500 text-warm-950 px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Voice-Over
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            )}

            {/* VOICE-OVER TAB */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Generate Voice-Over</h2>
                
                {/* Mode Selection */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setVoiceMode('ai')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      voiceMode === 'ai'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-sand-700/50 hover:border-sand-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">🎙️</div>
                    <div className="font-bold text-white">AI Voice</div>
                    <div className="text-sm text-sand-400">ElevenLabs TTS</div>
                  </button>
                  <button
                    onClick={() => setVoiceMode('record')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      voiceMode === 'record'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-sand-700/50 hover:border-sand-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">🎤</div>
                    <div className="font-bold text-white">Record Audio</div>
                    <div className="text-sm text-sand-400">Use your voice</div>
                  </button>
                </div>

                {/* AI Voice Mode */}
                {voiceMode === 'ai' && (
                  <div>
                    {!generatedAudioUrl ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-full mb-4">
                          <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">AI Voice Generation</h3>
                        <p className="text-sand-400 mb-6">ElevenLabs will generate professional voice-over from your script</p>
                        
                        <button
                          onClick={handleGenerateVoiceover}
                          disabled={isGeneratingVoice}
                          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isGeneratingVoice ? (
                            <>
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Generating Voiceover...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Generate with ElevenLabs
                            </>
                          )}
                        </button>
                        <p className="text-sand-500 text-sm mt-4">Using {tone.toLowerCase()} tone</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full mb-4">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-400 text-sm font-semibold">Voiceover generated!</span>
                        </div>
                        <audio controls src={generatedAudioUrl} className="mx-auto mb-4 w-full max-w-md" />
                        <button
                          onClick={() => {
                            setGeneratedAudioUrl(null)
                            setAudioBlob(null)
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-warm-800 text-white rounded-xl hover:bg-warm-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Re-generate
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Record Mode */}
                {voiceMode === 'record' && (
                  <div className="text-center py-8">
                    {!audioBlob ? (
                      <>
                        <div className="inline-flex items-center justify-center w-32 h-32 bg-red-500/20 rounded-full mb-6 relative">
                          {isRecording && (
                            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                          )}
                          <div className={`w-20 h-20 rounded-full ${isRecording ? 'bg-red-500' : 'bg-red-500/50'} flex items-center justify-center`}>
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                          </div>
                        </div>
                        
                        {isRecording && (
                          <div className="text-2xl font-bold text-white mb-4">{formatTime(recordingTime)}</div>
                        )}
                        
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                            isRecording
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105'
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 6h12v12H6z" />
                              </svg>
                              Stop Recording
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="8" />
                              </svg>
                              Start Recording
                            </>
                          )}
                        </button>
                        <p className="text-sand-400 text-sm mt-4">Click to {isRecording ? 'stop' : 'start'} recording your voice-over</p>
                      </>
                    ) : (
                      <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full mb-4">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-400 text-sm font-semibold">Recording complete!</span>
                        </div>
                        <audio controls src={URL.createObjectURL(audioBlob)} className="mx-auto mb-4" />
                        <button
                          onClick={() => {
                            setAudioBlob(null)
                            setRecordingTime(0)
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-warm-800 text-white rounded-xl hover:bg-warm-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Re-record
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CapCut Package Section */}
                {audioBlob && (scriptMode === 'ai' ? generatedScript : manualScript) && (
                  <div className="mt-6 pt-6 border-t border-sand-700/30">
                    {!capCutPackageUrl ? (
                      <div className="text-center">
                        <p className="text-sand-400 text-sm mb-4">✅ Your script and voice-over are ready!</p>
                        <button
                          onClick={handleCreateCapCutPackage}
                          disabled={isCreatingCapCutPackage}
                          className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                        >
                          {isCreatingCapCutPackage ? (
                            <>
                              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Creating CapCut Package...
                            </>
                          ) : (
                            <>
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                              </svg>
                              Create Reel (CapCut)
                            </>
                          )}
                        </button>
                        <p className="text-sand-500 text-xs mt-3">Export your assets for CapCut video editing</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full mb-4">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-400 text-sm font-semibold">CapCut package downloaded!</span>
                        </div>
                        
                        <div className="bg-warm-800/50 rounded-xl p-6 max-w-md mx-auto mb-4">
                          <p className="text-white mb-4">Your CapCut package has been downloaded. It includes:</p>
                          <ul className="text-sand-300 text-sm space-y-2 text-left">
                            <li className="flex items-center gap-2">
                              <span className="text-green-400">✓</span> voiceover.mp3 - Professional voice-over
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-green-400">✓</span> subtitles.srt - Timed captions
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-green-400">✓</span> storyboard.txt - Scene descriptions
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-green-400">✓</span> script.txt - Full script
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-green-400">✓</span> README.txt - Complete instructions
                            </li>
                          </ul>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <a
                            href="https://www.capcut.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open CapCut
                          </a>
                        </div>
                        
                        <button
                          onClick={() => setCapCutPackageUrl(null)}
                          className="text-sand-400 hover:text-white text-sm transition-colors mt-4"
                        >
                          Create Another Package
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-sand-700/30">
                  <div className="text-center">
                    <button
                      onClick={() => setActiveTab('script')}
                      className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Script
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center text-sand-600 text-sm">
          © 2026 BookReel. Transform books into videos.
        </div>
      </footer>
    </div>
  )
}

// Wrap in Suspense to handle useSearchParams during static export
export default function VideoMachinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-warm-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
          <p className="mt-4 text-sand-300">Loading...</p>
        </div>
      </div>
    }>
      <VideoMachinePageContent />
    </Suspense>
  )
}
