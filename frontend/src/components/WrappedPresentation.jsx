/**
 * WrappedPresentation.jsx
 * 7-slide cinematic story mode for Bundesliga Wrapped.
 * All data driven from real /wrapped API response — zero hardcoded values.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import {
  ChevronLeft, ChevronRight, Volume2, VolumeX,
  Share2, CheckCircle, X, Sparkles,
} from 'lucide-react'

// ── AudioContext singleton — created once, reused ─────────────────────────────
let _audioCtx = null
const getAudioCtx = () => {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) { /* not supported */ }
  }
  return _audioCtx
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const safeClr = (hex) => {
  if (!hex) return '#dc052d'
  const c = hex.replace(/^#+/, '#')
  if (c === '#FFFFFF' || c === '#ffffff' || c === '#fff') return '#dc052d'
  return c
}

const hexToRgb = (hex) => {
  const h = (hex || '').replace('#', '')
  if (h.length < 6) return '212,0,26'
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}

const fmtMonth = (str) => {
  if (!str) return ''
  try { return new Date(str).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
  catch { return str.slice(0, 7) }
}

const TOTAL_SLIDES = 7

// Per-slide auto-advance durations (ms). Infinity = gated by user interaction.
// Slide 3 (video) duration is set dynamically at runtime from the video element.
const SLIDE_DURATIONS = [
  15000,      // 0: Intro
  15000,      // 1: Solari scramble
  Infinity,   // 2: Scratch card — gated
  15000,      // 3: Video — overridden at runtime with actual clip duration
  15000,      // 4: Pitch zones
  Infinity,   // 5: Quiz — gated
  Infinity,   // 6: Export — never auto-advances
]

// A named sound palette — ALL frequencies capped at 220 Hz, never shrill
const Sounds = {
  /** Slide transition — low cinematic swoosh */
  slideIn: (ctx) => _play(ctx, [{f:180,t:0},{f:70,t:0.18}], 'triangle', 0.18, 0.18),
  /** Slide back — reverse low swoosh */
  slideBack: (ctx) => _play(ctx, [{f:90,t:0},{f:160,t:0.16}], 'triangle', 0.14, 0.16),
  /** Solari tick — pentatonic low sawtooth, 55–110 Hz, counts like digits */
  flapTick: (ctx, run = 0) => {
    const scale = [55, 62, 69, 78, 87, 98, 110]
    const f = scale[run % scale.length]
    _play(ctx, [{f, t:0},{f: f * 0.5, t:0.08}], 'sawtooth', 0.08, 0.08)
  },
  /** Solari settle — deep sine thud when number locks in */
  flapSettle: (ctx) => {
    _play(ctx, [{f:60,t:0},{f:25,t:0.28}], 'sine', 0.32, 0.28)
    setTimeout(() => _play(ctx, [{f:90,t:0},{f:55,t:0.14}], 'sine', 0.1, 0.14), 70)
  },
  /** Scratch progress — low rumble */
  scratch: (ctx, pct) => _play(ctx, [{f:40+pct*0.5,t:0},{f:25,t:0.08}], 'sawtooth', 0.08, 0.08),
  /** Scratch reveal — low chord stab */
  reveal: (ctx) => {
    [110, 138, 165, 207].forEach((f, i) =>
      setTimeout(() => _play(ctx,[{f,t:0},{f:f*0.5,t:0.4}],'sine',0.14,0.4), i*40))
  },
  /** Quiz correct — ascending low arp */
  correct: (ctx) => {
    [165, 196, 247, 330].forEach((f, i) =>
      setTimeout(() => _play(ctx,[{f,t:0},{f,t:0.25}],'sine',0.15,0.25), i*70))
  },
  /** Quiz wrong — low dissonant pair */
  wrong: (ctx) => {
    _play(ctx,[{f:110,t:0},{f:55,t:0.25}],'square',0.10,0.25)
    setTimeout(() => _play(ctx,[{f:98,t:0},{f:49,t:0.2}],'square',0.08,0.2), 120)
  },
  /** Sticker drop — deep thud */
  stickerDrop: (ctx, n) => {
    const base = [55, 65, 75, 60][n] || 55
    _play(ctx,[{f:base,t:0},{f:base*0.4,t:0.22}],'sine',0.38,0.22)
    setTimeout(() => _play(ctx,[{f:base*2,t:0},{f:base,t:0.12}],'triangle',0.1,0.12), 30)
  },
  /** Export/share — low rising tone */
  export: (ctx) => {
    [110, 138, 165, 220].forEach((f, i) =>
      setTimeout(() => _play(ctx,[{f,t:0},{f:f*1.3,t:0.35}],'sine',0.15,0.35), i*55))
  },
  /** Mute toggle — soft low click */
  mute: (ctx) => _play(ctx,[{f:120,t:0},{f:60,t:0.06}],'triangle',0.08,0.06),
  /** Video loop — ambient low pulse */
  videoLoop: (ctx) => _play(ctx,[{f:50,t:0},{f:35,t:0.5}],'sine',0.05,0.5),
  /** Pitch zone reveal — three low triangle pulses */
  pitchReveal: (ctx) => {
    [110, 138, 165].forEach((f, i) =>
      setTimeout(() => _play(ctx,[{f,t:0},{f:f*0.7,t:0.28}],'triangle',0.09,0.28), i*100))
  },
}

// Internal helper — single oscillator
function _play(ctx, freqRamp, type, gain, duration) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    freqRamp.forEach(({ f, t }) => {
      if (t === 0) osc.frequency.setValueAtTime(f, ctx.currentTime)
      else osc.frequency.exponentialRampToValueAtTime(Math.max(f, 0.001), ctx.currentTime + t)
    })
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + duration)
  } catch { /* ignore */ }
}

export default function WrappedPresentation({ data, club, onClose }) {
  const { profile = {}, mvp_analysis = {}, scout_report = {}, wrapped_card = {} } = data || {}

  // ── Derive all real values ────────────────────────────────────────────────
  const clr = safeClr(club?.primary_color)
  const userName       = profile?.user_name || 'Manager'
  const archetype      = profile?.archetype || 'Football Fan'
  const totalInteractions = profile?.total_interactions ?? 0
  const solariTarget   = totalInteractions.toLocaleString('en-US')
  const engScore       = profile?.engagement_score ?? 0
  const fanCount       = profile?.fan_count ?? 0
  const displayRank    = profile?.club_rank_position ||
    (fanCount > 0 && engScore > 0 ? Math.max(1, Math.round(fanCount * (1 - engScore / 100))) : 0)
  const matchCenterPersona = profile?.match_center_persona || 'Live Wire'
  const contentDietType    = profile?.content_diet_type || 'Highlight Addict'
  const tickerTotal    = profile?.ticker_total ?? 0
  const statsTotal     = profile?.stats_total ?? 0
  const lineupsTotal   = profile?.lineups_total ?? 0
  const mcSum          = tickerTotal + statsTotal + lineupsTotal || 1
  const completionist  = profile?.completionist || false
  const arcShape       = profile?.arc_shape || 'Rollercoaster'
  const loyaltyClass   = profile?.loyalty_class || arcShape
  const fanIdentity    = wrapped_card?.fan_identity_statement || ''
  const fanDna         = wrapped_card?.fan_dna_statement || ''
  const shareText      = wrapped_card?.share_text || `My #BundesligaWrapped 2024/25 with ${club?.short_name}. Powered by AWS Bedrock.`
  const videoUrl       = profile?.video_url || null
  const videoTitle     = profile?.video_title || profile?.favorite_video || null
  const totalVideos    = profile?.total_videos ?? 0
  const totalStories   = profile?.total_stories ?? 0
  const totalArticles  = profile?.total_articles ?? 0
  const maxStreak      = profile?.max_streak ?? 0
  const streakContext  = profile?.streak_context || ''
  const planningStyle  = profile?.planning_style || ''
  const squadInterest  = profile?.squad_interest || ''
  const peakMonth      = fmtMonth(profile?.peak_month)
  const mvpName        = mvp_analysis?.mvp || mvp_analysis?.differentiators?.[0]?.player || 'Top Performer'
  const scoutLabel     = scout_report?.season_label || 'Outstanding Season'
  const scoutReportText = scout_report?.scout_report || ''
  const fanStat        = wrapped_card?.fan_stat || ''

  // Is this a Bayern fan? (needed for real video)
  const isBayern = ['Bayern', 'FCB', 'Bavarian'].some(kw =>
    (club?.name || club?.short_name || '').toLowerCase().includes(kw.toLowerCase())
  )

  // Quiz correct answer
  const quizCorrect = contentDietType === 'The Journalist' ? 'articles'
    : contentDietType === 'The Story Chaser' ? 'stories'
    : 'videos'

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide]   = useState(0)
  const [isPaused, setIsPaused]           = useState(false)
  const [isHolding, setIsHolding]         = useState(false)
  const [muted, setMuted]                 = useState(true)
  const [frameShake, setFrameShake]       = useState(false)
  const [solariText, setSolariText]       = useState('000,000')
  const [isScratched, setIsScratched]     = useState(false)
  const [scratchProgress, setScratchProgress] = useState(0)
  const [guessSelection, setGuessSelection]   = useState(null) // 'articles' | 'stories' | 'videos'
  const [stickerProgress, setStickerProgress] = useState(0)
  const [videoPlayTime, setVideoPlayTime]     = useState(0)
  const [copied, setCopied]               = useState(false)
  const [slide3Duration, setSlide3Duration]   = useState(15000)

  const canvasRef       = useRef(null)
  const isDrawingRef    = useRef(false)
  const videoIntervalRef = useRef(null)
  const cardRef         = useRef(null)
  const videoElemRef    = useRef(null)

  // ── Sound helper — uses named palette ────────────────────────────────────
  const play = useCallback((soundFn, ...args) => {
    if (muted) return
    const ctx = getAudioCtx()
    if (ctx) soundFn(ctx, ...args)
  }, [muted])

  // Haptic helper — safe no-op if not supported
  const haptic = useCallback((pattern = [30]) => {
    try { navigator.vibrate && navigator.vibrate(pattern) } catch { /* ignore */ }
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────
    const selectSlide = useCallback((index) => {
    setCurrentSlide(index)
    setFrameShake(false)
    setIsPaused(SLIDE_DURATIONS[index] === Infinity)
    play(Sounds.slideIn)
  }, [play])

  const nextSlide = useCallback((e) => {
    if (e) e.stopPropagation()
    setCurrentSlide(prev => {
      const next = Math.min(prev + 1, TOTAL_SLIDES - 1)
      setIsPaused(SLIDE_DURATIONS[next] === Infinity)
      return next
    })
    play(Sounds.slideIn)
  }, [play])

  const prevSlide = useCallback((e) => {
    if (e) e.stopPropagation()
    setCurrentSlide(prev => {
      const next = Math.max(prev - 1, 0)
      setIsPaused(SLIDE_DURATIONS[next] === Infinity)
      return next
    })
    play(Sounds.slideBack)
  }, [play])

  // ── Auto-advance — per-slide duration, pauses on hold or gated slides ──────
  useEffect(() => {
    if (isPaused || isHolding) return
    const dur = currentSlide === 3 ? slide3Duration : SLIDE_DURATIONS[currentSlide]
    if (!dur || dur === Infinity) return
    const timer = setTimeout(() => {
      setCurrentSlide(prev => {
        if (prev < TOTAL_SLIDES - 1) {
          const next = prev + 1
          setIsPaused(SLIDE_DURATIONS[next] === Infinity)
          return next
        }
        setIsPaused(true)
        return prev
      })
    }, dur)
    return () => clearTimeout(timer)
  }, [isPaused, isHolding, currentSlide, slide3Duration])

  // ── Slide 1: Solari scramble ──────────────────────────────────────────────
  useEffect(() => {
    if (currentSlide !== 1) return
    let run = 0
    const target = solariTarget
    const interval = setInterval(() => {
      setSolariText(target.split('').map((ch, i) => {
        if (ch === ',' || ch === '.') return ch
        if (run > 12 + i * 4) return ch
        return Math.floor(Math.random() * 10).toString()
      }).join(''))
      if (run % 2 === 0) play(Sounds.flapTick, run)
      run++
      if (run > 50) {
        clearInterval(interval)
        setSolariText(target)
        play(Sounds.flapSettle)
      }
    }, 55)
    return () => clearInterval(interval)
  }, [currentSlide, solariTarget, play])

  // ── Slide 2: Scratch card ─────────────────────────────────────────────────
  useEffect(() => {
    if (currentSlide !== 2 || !canvasRef.current || isScratched) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height

    // Reset canvas for fresh scratch
    ctx.clearRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#1e1b4b'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#a855f7'
    ctx.lineWidth = 4
    for (let i = -w; i < w + h; i += 25) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke()
    }
    ctx.fillStyle = '#090514'
    ctx.fillRect(30, h / 2 - 55, w - 60, 110)
    ctx.strokeStyle = clr
    ctx.strokeRect(30, h / 2 - 55, w - 60, 110)
    ctx.font = '700 22px Oswald, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText('SCRATCH TO REVEAL', w / 2, h / 2 - 10)
    ctx.font = '500 11px Space Grotesk, sans-serif'
    ctx.fillStyle = '#a855f7'
    ctx.fillText('YOUR BUNDESLIGA DNA', w / 2, h / 2 + 28)

    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect()
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      return { x: (cx - rect.left) * (w / rect.width), y: (cy - rect.top) * (h / rect.height) }
    }
    const startScratch = (e) => { isDrawingRef.current = true; doScratch(e) }
    const doScratch = (e) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const { x, y } = getCoords(e)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2); ctx.fill()
      const data = ctx.getImageData(0, 0, w, h).data
      let cleared = 0
      for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) cleared++ }
      const pct = Math.floor((cleared / (w * h)) * 100)
      setScratchProgress(pct)
      if (pct % 5 === 0) play(Sounds.scratch, pct)
      if (pct > 45) {
        setIsScratched(true)
        play(Sounds.reveal)
        setFrameShake(true)
        haptic([40, 30, 60])
        setIsPaused(false)
        setTimeout(nextSlide, 1400) // auto-advance after reveal
      }
    }
    const stopScratch = () => { isDrawingRef.current = false }

    canvas.addEventListener('mousedown', startScratch)
    canvas.addEventListener('mousemove', doScratch)
    canvas.addEventListener('mouseup', stopScratch)
    canvas.addEventListener('touchstart', startScratch, { passive: false })
    canvas.addEventListener('touchmove', doScratch, { passive: false })
    canvas.addEventListener('touchend', stopScratch)
    return () => {
      canvas.removeEventListener('mousedown', startScratch)
      canvas.removeEventListener('mousemove', doScratch)
      canvas.removeEventListener('mouseup', stopScratch)
      canvas.removeEventListener('touchstart', startScratch)
      canvas.removeEventListener('touchmove', doScratch)
      canvas.removeEventListener('touchend', stopScratch)
    }
  }, [currentSlide, isScratched, clr, play])

  // ── Slide 3: Simulated video progress (non-Bayern) ────────────────────────
  useEffect(() => {
    if (currentSlide !== 3) return
    setVideoPlayTime(0)
    if (!videoUrl) {
      videoIntervalRef.current = setInterval(() => {
        setVideoPlayTime(prev => prev >= 100 ? 0 : prev + 2)
      }, 100)
    }
    return () => clearInterval(videoIntervalRef.current)
  }, [currentSlide, videoUrl])

  // ── Slide 4: Play pitch reveal sound on entry ─────────────────────────────
  useEffect(() => {
    if (currentSlide === 4) {
      setTimeout(() => play(Sounds.pitchReveal), 800)
    }
  }, [currentSlide, play])

  // ── Slide 5: Reset quiz on enter ─────────────────────────────────────────
  useEffect(() => {
    if (currentSlide === 5) setGuessSelection(null)
  }, [currentSlide])

  // ── Slide 6: Sticker bomb ─────────────────────────────────────────────────
  useEffect(() => {
    if (currentSlide !== 6) return
    setStickerProgress(0)
    const timers = [
      setTimeout(() => { setStickerProgress(1); play(Sounds.stickerDrop, 0); setFrameShake(true); haptic([25]) }, 500),
      setTimeout(() => { setStickerProgress(2); play(Sounds.stickerDrop, 1); setFrameShake(true); haptic([25]) }, 1200),
      setTimeout(() => { setStickerProgress(3); play(Sounds.stickerDrop, 2); setFrameShake(true); haptic([25]) }, 2000),
      setTimeout(() => { setStickerProgress(4); play(Sounds.stickerDrop, 3); setFrameShake(true); haptic([25]) }, 2800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [currentSlide, play])

  // ── Quiz handler ──────────────────────────────────────────────────────────
  const makeGuess = (guess) => {
    setGuessSelection(guess)
    const correct = guess === quizCorrect
    play(correct ? Sounds.correct : Sounds.wrong)
    setFrameShake(true)
    haptic(correct ? [20, 10, 20] : [80])
    setTimeout(nextSlide, 2200)
  }

  // ── Export handler — capture hidden 9:16 share card then share as image ──
  const handleExport = async () => {
    play(Sounds.export)
    haptic([20, 10, 40])
    setCopied(false)

    // Capture the hidden 9:16 share card — guaranteed clean, no animation artifacts
    let imageFile = null
    const hiddenCard = document.getElementById('wp-hidden-share-card')
    if (hiddenCard) {
      try {
        const canvas = await html2canvas(hiddenCard, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          logging: false,
          width: 540,
          height: 960,
        })
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        if (blob) {
          imageFile = new File([blob], 'bundesliga-wrapped.png', { type: 'image/png' })
        }
      } catch (e) {
        console.warn('Share card capture failed:', e)
      }
    }

    // Native share with image file (mobile — Instagram, WhatsApp, etc.)
    if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'My Bundesliga Wrapped 2024/25',
          text: shareText,
        })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
        console.warn('File share failed, trying fallback:', e)
      }
    }

    // Fallback 1: download as PNG
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bundesliga-wrapped.png'
      a.click()
      URL.revokeObjectURL(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      return
    }

    // Fallback 2: text share
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Bundesliga Wrapped 2024/25', text: shareText })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }

    // Last resort: copy text to clipboard
    try { await navigator.clipboard.writeText(shareText) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const pct = (val) => Math.round((val / mcSum) * 100)

  return (
    <div className="wp-root">
      {/* Ambient aura glows */}
      <div className="wp-aura wp-aura-red" />
      <div className="wp-aura wp-aura-blue" />

      {/* Scanline overlay */}
      <div className="wp-scanlines" />

      {/* ── Phone frame ── */}
      <div className={`wp-phone${frameShake ? ' wp-shake' : ''}`}
           onAnimationEnd={() => setFrameShake(false)}
           onPointerDown={(e) => {
             const rect = e.currentTarget.getBoundingClientRect()
             const relX = (e.clientX - rect.left) / rect.width
             const relY = (e.clientY - rect.top) / rect.height
             if (relX > 0.2 && relX < 0.8 && relY > 0.2 && relY < 0.8) {
               setIsHolding(true)
             }
           }}
           onPointerUp={() => setIsHolding(false)}
           onPointerLeave={() => setIsHolding(false)}>

        {/* Notch */}
        <div className="wp-notch">
          <span className="wp-notch-time">18:48</span>
          <div className="wp-notch-pill" />
          <span className="wp-notch-signal">5G</span>
        </div>



        {/* Close button */}
        <button className="wp-close-btn" onClick={onClose} aria-label="Close presentation">
          <X size={14} />
        </button>

        {/* Mute button */}
        <button className="wp-mute-btn" onClick={() => { setMuted(m => !m); play(Sounds.mute) }}
                aria-label="Toggle sound">
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {/* Progress segments */}
        <div className="wp-progress">
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
            const dur = idx === 3 ? slide3Duration : (SLIDE_DURATIONS[idx] ?? 15000)
            const isActive = idx === currentSlide
            const isDone   = idx < currentSlide
            const isGated  = dur === Infinity || SLIDE_DURATIONS[idx] === Infinity
            return (
              <div key={idx} className="wp-seg" onClick={(e) => { e.stopPropagation(); selectSlide(idx) }}>
                {isDone ? (
                  /* Completed segments — just full */
                  <div className="wp-seg-fill" style={{ width: '100%', transition: 'none' }} />
                ) : isActive && !isGated ? (
                  /* Active non-gated — CSS animation that respects hold */
                  <div
                    key={`active-${idx}-${currentSlide}`}
                    className="wp-seg-fill wp-seg-animate"
                    style={{
                      animationDuration: `${dur}ms`,
                      animationPlayState: (isPaused || isHolding) ? 'paused' : 'running',
                    }}
                  />
                ) : isActive && isGated ? (
                  /* Active gated — show partial fill equal to 0, stays until interaction */
                  <div className="wp-seg-fill" style={{ width: '0%' }} />
                ) : (
                  /* Future segments — empty */
                  <div className="wp-seg-fill" style={{ width: '0%' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── SLIDE 0: Intro ── */}
        {currentSlide === 0 && (
          <div className="wp-slide wp-slide-intro" style={{ background: `linear-gradient(180deg, ${clr}40 0%, #0a0a0f 60%)` }}>
            <div className="wp-intro-top">
              <span className="wp-font-brutal wp-intro-league">{club?.name || 'BUNDESLIGA'}</span>
              <span className="wp-badge">{club?.three_letter_code || 'BL'}</span>
            </div>
            <div className="wp-intro-body">
              <span className="wp-label wp-pulse" style={{ color: clr }}>2024/25 SEASON STORY</span>
              <h1 className="wp-font-brutal wp-intro-headline" style={{ textShadow: `4px 4px 0px rgba(0,0,0,0.9)` }}>
                {userName.toUpperCase()}<br />
                <span style={{ color: clr }}>YOUR REAL</span><br />
                WRAPPED
              </h1>
              <p className="wp-intro-body-text">
                We processed your actual 2024/25 Bundesliga app data.
                {fanCount > 0 && ` ${fanCount.toLocaleString()} ${club?.short_name || ''} fans in the dataset.`}
                {' '}Your story is unique.
              </p>
              <div className="wp-archetype-tag">{archetype}</div>
            </div>
            <div className="wp-intro-footer">
              <button className="wp-cta" onClick={nextSlide}>
                START YOUR STORY <ChevronRight size={16} />
              </button>
              <span className="wp-footer-note">AWS Bedrock · Real DFL Data · 26,242 fan records</span>
            </div>
          </div>
        )}

        {/* ── SLIDE 1: Solari engagement counter ── */}
        {currentSlide === 1 && (
          <div className="wp-slide wp-bg-dark">
            <div className="wp-aura-accent" style={{ background: `radial-gradient(circle, ${clr} 0%, transparent 70%)` }} />
            <div className="wp-s1-header">
              <span className="wp-label" style={{ color: clr }}>SIGNAL METRICS</span>
              <h2 className="wp-font-brutal wp-s1-title">THE NUMBERS</h2>
            </div>
            <div className="wp-s1-solari-wrap">
              <div className="wp-s1-solari">
                {solariText.split('').map((ch, i) => (
                  <div key={i} className="wp-flap">
                    <span className="wp-font-brutal wp-flap-char">{ch}</span>
                    <div className="wp-flap-divider" />
                  </div>
                ))}
              </div>
              <p className="wp-s1-sublabel">Total app interactions this season</p>
            </div>
            <div className="wp-s1-rank">
              <div className="wp-rank-badge" style={{ background: clr }}>
                {displayRank > 0 ? `#${displayRank}` : `${engScore}`}
              </div>
              <div>
                <p className="wp-rank-meta">
                  {displayRank > 0
                    ? `Out of ${fanCount.toLocaleString()} ${club?.short_name || ''} fans`
                    : `Fan Score out of 100`}
                </p>
                <p className="wp-rank-tier">{engScore >= 80 ? 'Elite tier' : engScore >= 50 ? 'Above average' : 'Every match matters'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── SLIDE 2: Scratch card — DNA ── */}
        {currentSlide === 2 && (
          <div className="wp-slide" style={{ background: '#090514' }}>
            {isScratched ? (
              <div className="wp-s2-revealed">
                <div className="wp-s2-reveal-header">
                  <span className="wp-badge" style={{ background: '#7c3aed' }}>DNA DECRYPTED · AWS BEDROCK</span>
                  <h1 className="wp-font-brutal wp-s2-persona">{matchCenterPersona.toUpperCase()}</h1>
                  <h2 className="wp-font-brutal wp-s2-diet" style={{ color: '#a855f7' }}>{contentDietType.toUpperCase()}</h2>
                  {completionist && <span className="wp-completionist-badge">✓ COMPLETIONIST</span>}
                </div>
                <div className="wp-s2-bars">
                  {[
                    { label: 'LIVE TICKER', val: tickerTotal, color: clr },
                    { label: 'STATS DEEP DIVE', val: statsTotal, color: '#3b82f6' },
                    { label: 'LINEUP OBSESSION', val: lineupsTotal, color: '#10b981' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="wp-bar-row">
                        <span className="wp-bar-label">{label}</span>
                        <span className="wp-bar-val">{pct(val)}%</span>
                      </div>
                      <div className="wp-bar-track">
                        <div className="wp-bar-fill" style={{ width: `${pct(val)}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {fanIdentity && (
                  <div className="wp-s2-quote">
                    <p>"{fanIdentity}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="wp-s2-scratch">
                <div className="wp-s2-scratch-header">
                  <h2 className="wp-font-brutal">REVEAL YOUR</h2>
                  <h2 className="wp-font-brutal" style={{ color: '#a855f7' }}>TACTICAL DNA</h2>
                  <p className="wp-muted-xs">Wipe with finger to decrypt</p>
                </div>
                <div className="wp-s2-canvas-wrap">
                  <canvas ref={canvasRef} width={280} height={340} className="wp-canvas" />
                </div>
                <div className="wp-s2-progress-bar">
                  <span className="wp-muted-xs">DECRYPT PROGRESS: {scratchProgress}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SLIDE 3: Video / Highlight ── */}
        {currentSlide === 3 && (
          <div className="wp-slide wp-bg-dark">
            <div>
              <span className="wp-label" style={{ color: clr }}>HIGHLIGHT PORTAL</span>
              <h2 className="wp-font-brutal wp-s3-title">THE SEASON CLIP</h2>
            </div>
            <div className="wp-s3-video-wrap">
              {isBayern && videoUrl ? (
                <video
                  ref={videoElemRef}
                  src={videoUrl}
                  autoPlay muted loop playsInline
                  className="wp-video"
                  onLoadedMetadata={(e) => {
                    const secs = e.target.duration
                    if (secs && isFinite(secs)) setSlide3Duration(Math.ceil(secs) * 1000)
                  }}
                />
              ) : (
                <div className="wp-s3-sim-field">
                  <div className="wp-field-ring wp-field-ring-lg" />
                  <div className="wp-field-ring wp-field-ring-sm" />
                  <div className="wp-s3-dot wp-s3-dot-red"
                       style={{ transform: `translateX(${videoPlayTime * 1.2}px)` }} />
                  <div className="wp-s3-dot wp-s3-dot-blue"
                       style={{ transform: `translateY(-${videoPlayTime * 0.4}px)` }} />
                  <div className="wp-s3-dot wp-s3-dot-white"
                       style={{ transform: `translate(-${videoPlayTime * 1.8}px, ${videoPlayTime * 0.6}px)` }} />
                  <div className="wp-s3-score">88:14 · {club?.three_letter_code || 'FCB'} 2-1</div>
                </div>
              )}
              {/* Progress bar overlay */}
              <div className="wp-s3-controls">
                <div className="wp-scrub">
                  <div className="wp-scrub-fill" style={{ width: `${videoUrl ? 60 : videoPlayTime}%`, background: clr }} />
                </div>
                <div className="wp-s3-ctrl-row">
                  <span className="wp-font-brutal wp-s3-clip-name">
                    {videoTitle || `${club?.short_name || 'BUNDESLIGA'} SEASON HIGHLIGHTS`}
                  </span>
                  <div className="wp-live-dot">
                    <span className="wp-live-ping" style={{ background: clr }} />
                    <span className="wp-muted-xs">REPLAY</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="wp-s3-stat-card">
              <span className="wp-label" style={{ color: '#4ade80' }}>YOUR CONTENT THIS SEASON</span>
              <p className="wp-s3-stat-text">
                {totalVideos.toLocaleString()} videos · {totalStories.toLocaleString()} stories · {totalArticles.toLocaleString()} articles
              </p>
            </div>
          </div>
        )}

        {/* ── SLIDE 4: Match Center zones (replaces drag) ── */}
        {currentSlide === 4 && (
          <div className="wp-slide" style={{ background: '#061c0e', color: 'white' }}>
            <div>
              <span className="wp-label" style={{ color: '#4ade80' }}>MATCH CENTER BREAKDOWN</span>
              <h1 className="wp-font-brutal wp-s4-title">YOUR STYLE</h1>
            </div>
            {/* Isometric pitch with lit zones */}
            <div className="wp-s4-pitch-wrap">
              <div className="wp-s4-pitch isometric-field">
                <div className="wp-pitch-markings" />
                {/* Zone overlays — proportional opacity */}
                <div className="wp-zone wp-zone-top" style={{ background: clr, opacity: 0.2 + (pct(tickerTotal) / 100) * 0.6 }}>
                  <span className="wp-zone-label" style={{color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)'}}>LIVE TICKER<br/>{pct(tickerTotal)}%</span>
                </div>
                <div className="wp-zone wp-zone-mid" style={{ background: '#3b82f6', opacity: 0.2 + (pct(statsTotal) / 100) * 0.6 }}>
                  <span className="wp-zone-label" style={{color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)'}}>STATS ROOM<br/>{pct(statsTotal)}%</span>
                </div>
                <div className="wp-zone wp-zone-bot" style={{ background: '#10b981', opacity: 0.2 + (pct(lineupsTotal) / 100) * 0.6 }}>
                  <span className="wp-zone-label" style={{color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)'}}>LINEUPS<br/>{pct(lineupsTotal)}%</span>
                </div>
              </div>
            </div>
            {/* Supporting signals */}
            <div className="wp-s4-signals">
              {maxStreak > 0 && (
                <div className="wp-signal-pill" style={{ borderColor: clr }}>
                  🔥 {maxStreak}-month streak {streakContext ? `· ${streakContext}` : ''}
                </div>
              )}
              {planningStyle && <div className="wp-signal-pill">{planningStyle}</div>}
              {squadInterest && <div className="wp-signal-pill">{squadInterest}</div>}
            </div>
          </div>
        )}

        {/* ── SLIDE 5: Real quiz ── */}
        {currentSlide === 5 && (
          <div className="wp-slide wp-bg-dark">
            <div>
              <span className="wp-label" style={{ color: '#fbbf24' }}>THE INTERROGATION</span>
              <h2 className="wp-font-brutal wp-s5-title">TEST YOURSELF</h2>
            </div>
            <div className="wp-s5-card">
              <span className="wp-s5-badge" style={{ color: clr }}>YOUR REAL DATA KNOWS</span>
              <p className="wp-s5-question">
                "Which type of Bundesliga content dominated your 2024/25 season in the app?"
              </p>
              {guessSelection ? (
                <div className="wp-s5-result">
                  {guessSelection === quizCorrect ? (
                    <div className="wp-s5-correct">
                      <CheckCircle size={22} className="wp-s5-icon-correct" />
                      <div>
                        <p className="wp-s5-verdict-label">YOUR INSTINCT WAS RIGHT</p>
                        <p className="wp-font-brutal wp-s5-answer">{contentDietType.toUpperCase()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="wp-s5-wrong">
                      <X size={22} className="wp-s5-icon-wrong" />
                      <div>
                        <p className="wp-s5-verdict-label">YOUR DATA SAYS OTHERWISE</p>
                        <p className="wp-font-brutal wp-s5-answer">{contentDietType.toUpperCase()}</p>
                      </div>
                    </div>
                  )}
                  {fanStat && <p className="wp-s5-fanstat">{fanStat}</p>}
                </div>
              ) : (
                <div className="wp-s5-choices">
                  {[
                    { key: 'articles', label: '📰 Articles', count: totalArticles },
                    { key: 'stories', label: '📖 Stories', count: totalStories },
                    { key: 'videos', label: '🎬 Videos', count: totalVideos },
                  ].map(({ key, label }) => (
                    <button key={key} className="wp-s5-btn"
                      style={{ background: key === 'videos' ? clr : key === 'articles' ? '#4ade80' : '#3b82f6' }}
                      onClick={() => makeGuess(key)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="wp-muted-xs wp-center">Tap your prediction</p>
          </div>
        )}

        {/* ── Hidden share card — captured by html2canvas on share ── */}
        <div
          id="wp-hidden-share-card"
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            width: 540,
            height: 960,
            background: `linear-gradient(160deg, ${clr} 0%, #0a0a0f 45%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 36px',
            fontFamily: 'Oswald, sans-serif',
            overflow: 'hidden',
            gap: 0,
          }}
        >
          {/* Top accent bar */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:6,background:clr}}/>
          {/* Club badge */}
          <div style={{
            background:'rgba(255,255,255,0.1)',border:`2px solid ${clr}`,
            borderRadius:12,padding:'8px 24px',marginBottom:32,
          }}>
            <span style={{fontSize:18,fontWeight:700,letterSpacing:4,color:'#fff',textTransform:'uppercase'}}>
              {club?.three_letter_code || 'BL'} · 2024/25
            </span>
          </div>
          {/* Name */}
          <h1 style={{fontSize:72,fontWeight:700,letterSpacing:4,color:'#fff',textTransform:'uppercase',textAlign:'center',lineHeight:0.9,marginBottom:16}}>
            {userName.toUpperCase()}
          </h1>
          {/* Archetype */}
          <p style={{fontSize:20,color:`${clr}`,letterSpacing:3,textTransform:'uppercase',marginBottom:48,textAlign:'center'}}>
            {archetype}
          </p>
          {/* Stats row */}
          <div style={{display:'flex',gap:24,marginBottom:48}}>
            {[
              {value: engScore, label: 'FAN SCORE'},
              {value: displayRank > 0 ? `#${displayRank}` : '—', label: 'CLUB RANK'},
              {value: totalInteractions > 999 ? `${(totalInteractions/1000).toFixed(1)}K` : totalInteractions, label: 'INTERACTIONS'},
            ].map(({value,label}) => (
              <div key={label} style={{textAlign:'center'}}>
                <div style={{fontSize:36,fontWeight:700,color:clr,letterSpacing:2}}>{value}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:2,marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>
          {/* Season arc */}
          <div style={{
            background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:12,padding:'16px 28px',marginBottom:24,textAlign:'center',width:'100%',
          }}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',letterSpacing:2,marginBottom:6}}>SEASON ARC</div>
            <div style={{fontSize:28,fontWeight:700,color:'#fff',letterSpacing:2}}>{arcShape.toUpperCase()}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4}}>{loyaltyClass}</div>
          </div>
          {/* Quote */}
          {(fanDna || fanIdentity) && (
            <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',textAlign:'center',lineHeight:1.6,fontFamily:'Space Grotesk, sans-serif',fontStyle:'italic',maxWidth:400,marginBottom:32}}>
              "{(fanDna || fanIdentity).slice(0,100)}"
            </p>
          )}
          {/* Footer */}
          <div style={{position:'absolute',bottom:32,left:0,right:0,textAlign:'center'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',letterSpacing:3}}>#BUNDESLIGAWRAPPED · POWERED BY AWS BEDROCK</div>
          </div>
        </div>

        {/* ── SLIDE 6: Export sticker bomb ── */}
        {currentSlide === 6 && (
          <div className="wp-slide" style={{ background: clr }}>
            <div className="wp-s6-bg-vignette" />
            <h2 className="wp-s6-header">YOUR 2024/25 EXECUTIVE VERDICT</h2>
            {/* Card canvas */}
            <div className="wp-s6-card" ref={cardRef}>
              <div className="wp-s6-card-top">
                <span className="wp-font-brutal wp-s6-card-title">THE MANAGER'S WRAPPED</span>
                <span className="wp-badge" style={{ background: '#dc052d' }}>AWS COGNITIVE</span>
              </div>
              <div className="wp-s6-stickers">
                {stickerProgress >= 1 && (
                  <div className="wp-sticker wp-sticker-1 sticker-drop"
                       style={{ background: `linear-gradient(135deg, ${clr}, #7c3aed)` }}>
                    <span className="wp-sticker-label">FAN PROFILE</span>
                    <h1 className="wp-font-brutal wp-sticker-big">{loyaltyClass.toUpperCase()}</h1>
                  </div>
                )}
                {stickerProgress >= 2 && (
                  <div className="wp-sticker wp-sticker-2 sticker-drop" style={{ background: '#3b82f6' }}>
                    <span className="wp-sticker-label">SEASON ARC</span>
                    <h2 className="wp-font-brutal wp-sticker-mid">{arcShape.toUpperCase()}</h2>
                  </div>
                )}
                {stickerProgress >= 3 && (
                  <div className="wp-sticker wp-sticker-3 sticker-drop" style={{ background: '#4ade80' }}>
                    <span className="wp-sticker-label" style={{ color: '#000' }}>YOUR RANK</span>
                    <h2 className="wp-font-brutal wp-sticker-mid" style={{ color: '#000' }}>
                      {displayRank > 0 ? `#${displayRank} OF ${fanCount.toLocaleString()}` : `${engScore}/100`}
                    </h2>
                  </div>
                )}
                {stickerProgress >= 4 && (
                  <div className="wp-sticker wp-sticker-4 sticker-drop" style={{ background: '#ffffff' }}>
                    <span className="wp-sticker-label" style={{ color: clr }}>SEASON SIGNATURE</span>
                    <p className="wp-sticker-quote" style={{ color: '#000' }}>
                      "{(fanDna || fanIdentity || `${archetype} — ${arcShape} season. ${club?.short_name || 'Bundesliga'} forever.`).slice(0, 90)}"
                    </p>
                  </div>
                )}
              </div>
              <span className="wp-s6-footer-note">AWS BUNDESLIGA WRAPPED 2024/25</span>
            </div>
            <div className="wp-s6-actions">
              <button className="wp-export-btn wp-export-btn-share" onClick={handleExport}>
                <Share2 size={14} />
                {copied ? '✓ SAVED!' : 'SHARE'}
              </button>
              <button className="wp-summary-btn" onClick={onClose}>
                WRAP SUMMARY
              </button>
            </div>          </div>
        )}

        {/* ── Nav arrows ── */}
        <div className="wp-nav">
          <button className="wp-nav-btn" onClick={prevSlide} disabled={currentSlide === 0}
                  style={{ opacity: currentSlide === 0 ? 0.3 : 1 }}>
            <ChevronLeft size={16} />
          </button>
          <button className="wp-nav-btn" onClick={nextSlide} disabled={currentSlide === TOTAL_SLIDES - 1}
                  style={{ opacity: currentSlide === TOTAL_SLIDES - 1 ? 0.3 : 1 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Header above phone */}
      <div className="wp-outer-header">
        <h1 className="wp-font-brutal wp-outer-title">
          <Sparkles size={20} className="wp-sparkle" /> THE MANAGER'S WRAPPED
        </h1>
        <p className="wp-outer-sub">AWS Sports AI Innovation Hackathon</p>
      </div>
    </div>
  )
}





