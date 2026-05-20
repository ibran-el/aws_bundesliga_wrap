import { useState, useEffect, useRef, useCallback } from 'react'
import './index.css'
import { fetchClubs, fetchWrapped, fetchMVP, fetchSubstitution, fetchAnalyzeSub, fetchMatches } from './api'
import WrappedPresentation from './components/WrappedPresentation'

const STYLES = ['High Press', 'Possession', 'Counter-Attack']

// ─────────────────────────────────────────────
// CINEMATIC REVEAL SCREEN
// State machine: flash → name → archetype → stat0 → stat1 → stat2 → mvp → done
// ─────────────────────────────────────────────
const PHASES = ['flash', 'name', 'archetype', 'stat0', 'stat1', 'stat2', 'global', 'persona', 'mvp', 'done']
const PHASE_DURATION = {
  flash:     900,
  name:      3200,
  archetype: 3200,
  stat0:     4500,
  stat1:     4500,
  stat2:     4500,
  global:    5000,   // global/club rank counter + reading
  persona:   4200,   // match center identity + content diet + fan identity sentence
  mvp:       5000,
  done:      0,
}

// Scramble text effect
function useScramble(target, active) {
  const [display, setDisplay] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const raf = useRef(null)
  const start = useRef(null)

  useEffect(() => {
    if (!active || !target) return
    const duration = 900
    const step = ts => {
      if (!start.current) start.current = ts
      const prog = Math.min((ts - start.current) / duration, 1)
      const revealed = Math.floor(prog * target.length)
      const scrambled = target.slice(0, revealed) +
        target.slice(revealed).split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join('')
      setDisplay(scrambled)
      if (prog < 1) raf.current = requestAnimationFrame(step)
      else setDisplay(target)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, active])

  return display
}

// Animated counter hook
function useCounter(target, active, duration = 1200) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)
  const start = useRef(null)

  useEffect(() => {
    if (!active) return
    const end = Number(target) || 0
    if (end === 0) { setValue(0); return }
    start.current = null
    const step = ts => {
      if (!start.current) start.current = ts
      const prog = Math.min((ts - start.current) / duration, 1)
      const ease = 1 - Math.pow(1 - prog, 3) // ease-out cubic
      setValue(Math.floor(ease * end))
      if (prog < 1) raf.current = requestAnimationFrame(step)
      else setValue(end)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, active])

  return value
}

// Particle burst
function Particles({ color }) {
  const count = 18
  const items = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360
    const dist = 80 + Math.random() * 120
    const dx = `${Math.cos(angle * Math.PI / 180) * dist}px`
    const dy = `${Math.sin(angle * Math.PI / 180) * dist}px`
    const size = 3 + Math.random() * 5
    return { dx, dy, size, delay: Math.random() * 0.2 }
  })
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 6 }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 0, left: 0,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: color || 'var(--accent)',
          '--dx': p.dx,
          '--dy': p.dy,
          animation: `particleFly 0.8s ${p.delay}s cubic-bezier(0.2,0,0.8,1) both`,
        }}/>
      ))}
    </div>
  )
}

function RevealScreen({ data, club, onDone }) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [key, setKey] = useState(0) // force re-mount for re-animation
  const timer = useRef(null)

  const phase = PHASES[phaseIdx]
  const clr = safeColor(club.primary_color) || '#d4001a'
  const { profile, mvp_analysis, scout_report, wrapped_card } = data

  const mvpName = mvp_analysis?.mvp || mvp_analysis?.players?.[0]?.name || 'Top Performer'
  const mvpScore = mvp_analysis?.players?.[0]?.impact_score
  const userName = profile?.user_name || 'Manager'
  const archetype = profile?.archetype || 'Football Fan'

  // Core stats
  const totalInteractions = profile?.total_interactions ?? 0
  const matchCenter       = profile?.total_match_center ?? 0
  const engScore          = profile?.engagement_score ?? 0
  const totalVideos       = profile?.total_videos ?? 0
  const totalStories      = profile?.total_stories ?? 0
  const favVideo          = profile?.favorite_video
  const country           = profile?.country || ''

  // New KPI fields
  const fanCount_r         = profile?.fan_count ?? 0
  const engScore_r         = profile?.engagement_score ?? 0
  // Derive club rank: position ≈ fanCount × (1 − percentile/100), clamped [1, fanCount]
  const derivedRankReveal  = fanCount_r > 0 && engScore_r > 0
    ? Math.max(1, Math.round(fanCount_r * (1 - engScore_r / 100)))
    : 0
  const globalRankPos      = profile?.club_rank_position || derivedRankReveal
  const totalFans          = fanCount_r
  const globalRank         = profile?.global_rank ?? engScore_r
  const matchCenterPersona = profile?.match_center_persona || ''
  const contentDietType    = profile?.content_diet_type || ''
  const arcShape           = profile?.arc_shape || ''
  const loyaltyClass       = profile?.loyalty_class || ''
  const peakMonth          = profile?.peak_month || ''
  const peakMonthRange     = profile?.peak_month_matchday_range || ''
  const maxStreak          = profile?.max_streak ?? 0
  const streakPeriod       = profile?.streak_period || ''
  const localeClass        = profile?.locale_class || ''
  const isInternational    = profile?.is_international || false
  const supermatchContext  = profile?.supermatch_context || ''

  // Format peak month for display (2025-05-01 → May 2025)
  const fmtMonth = (str) => {
    if (!str) return ''
    try {
      return new Date(str).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    } catch { return str.slice(0, 7) }
  }

  const stats = [
    {
      value:    totalInteractions,
      label:    'Total Interactions',
      sublabel: 'moments with the Bundesliga this season',
      context:  `${totalVideos.toLocaleString()} videos · ${totalStories.toLocaleString()} stories`,
    },
    {
      value:    matchCenter,
      label:    'Match Center Visits',
      sublabel: 'times you checked the live match',
      context:  wrapped_card?.tactical_identity || '',
    },
    {
      value:    engScore,
      label:    'Fan Score',
      sublabel: 'percentile rank among your club fans',
      context:  arcShape ? `${arcShape} season arc` : (archetype + (country ? ` · ${country}` : '')),
    },
  ]

  const advance = useCallback(() => {
    setPhaseIdx(i => {
      const next = i + 1
      if (PHASES[next] === 'done') { onDone(); return next }
      return next
    })
    setKey(k => k + 1)
  }, [onDone])

  const skip = () => { clearTimeout(timer.current); onDone() }

  useEffect(() => {
    if (phase === 'done') return
    const dur = PHASE_DURATION[phase]
    timer.current = setTimeout(advance, dur)
    return () => clearTimeout(timer.current)
  }, [phase, advance])

  // Scramble for name phase — runs for 1.5s then holds
  const scrambled = useScramble(userName.toUpperCase(), phase === 'name')

  // Counters for stat phases — 2s each to fill the longer phase
  const s0 = useCounter(stats[0].value, phase === 'stat0', 2000)
  const s1 = useCounter(stats[1].value, phase === 'stat1', 2000)
  const s2 = useCounter(stats[2].value, phase === 'stat2', 2000)
  const globalCounter = useCounter(globalRankPos, phase === 'global', 2400)
  const statValues = [s0, s1, s2]
  const fmtNum = n => {
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n/1000).toFixed(1)}K`
    return String(n)
  }

  const dotCount = PHASES.length - 2 // exclude flash + done
  const activeDot = Math.max(0, phaseIdx - 1)

  return (
    <>
      <button className="skip-btn" onClick={skip} aria-label="Skip reveal">SKIP</button>

      {/* Progress dots */}
      <div className="reveal-progress" role="progressbar" aria-label={`Reveal phase ${phaseIdx + 1}`}>
        {Array.from({ length: dotCount }, (_, i) => (
          <div key={i} className={`reveal-dot ${i === activeDot ? 'active' : ''}`}/>
        ))}
      </div>

      <div className="reveal-screen" style={{ background: 'var(--bg)' }}>
        {/* Radial burst rings on phase entry */}
        <div key={`burst-${key}`} className="reveal-burst-ring"
          style={{ background: `radial-gradient(circle, ${clr}, transparent)` }}
        />

        {/* Flash phase */}
        {phase === 'flash' && (
          <div key="flash" className="reveal-flash" style={{ background: clr }}/>
        )}

        {/* NAME phase */}
        {phase === 'name' && (
          <div key="name" className="phase-name-container">
            <div className="phase-name-label">Bundesliga Wrapped 2024/25</div>
            <div className="phase-name-text">{scrambled || userName.toUpperCase()}</div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 20,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              animation: 'labelUp 0.5s 1.4s ease-out both',
              opacity: 0,
            }}>
              Your season story is loading…
            </div>
            <Particles color={clr} />
          </div>
        )}

        {/* ARCHETYPE phase */}
        {phase === 'archetype' && (
          <div key="archetype" className="phase-archetype-container">
            <div className="phase-archetype-badge">{club.short_name}</div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 10,
              animation: 'labelUp 0.4s 0.15s ease-out both',
              opacity: 0,
            }}>You are a</div>
            <div className="phase-archetype-title">{archetype.toUpperCase()}</div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-muted)',
              marginTop: 20,
              fontWeight: 300,
              lineHeight: 1.6,
              maxWidth: 320,
              textAlign: 'center',
              animation: 'labelUp 0.5s 0.7s ease-out both',
              opacity: 0,
            }}>
              {wrapped_card?.greeting || `Welcome back, ${userName}.`}
            </div>
            {country && (
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
                marginTop: 12,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                animation: 'labelUp 0.4s 1.1s ease-out both',
                opacity: 0,
              }}>
                {country}{localeClass && localeClass !== 'Heimfan' ? ` · ${localeClass}` : ''}
              </div>
            )}
          </div>
        )}

        {/* STAT phases (0, 1, 2) */}
        {['stat0', 'stat1', 'stat2'].map((s, i) => phase === s && (
          <div key={s} className="phase-stat-container">
            <div className="phase-stat-label">{stats[i].label}</div>
            <span className="phase-stat-number" style={{ color: clr }}>
              {fmtNum(statValues[i])}
            </span>
            <div className="phase-stat-sublabel">{stats[i].sublabel}</div>
            <div className="phase-stat-context">{stats[i].context}</div>
            {/* Favourite video callout on KPI 1 */}
            {i === 0 && favVideo && (
              <div style={{
                marginTop: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 12,
                color: 'var(--text-muted)',
                maxWidth: 280,
                textAlign: 'center',
                animation: 'labelUp 0.4s 1.6s ease-out both',
                opacity: 0,
              }}>
                🎬 Most watched: <span style={{ color: 'var(--text)' }}>{favVideo}</span>
              </div>
            )}
            <Particles color={clr} />
          </div>
        ))}

        {/* GLOBAL RANK phase */}
        {phase === 'global' && (
          <div key="global" className="phase-stat-container">
            <div className="phase-stat-label">
              {totalFans > 0 ? `Your rank among ${totalFans.toLocaleString()} ${club.short_name} fans` : 'Your fan rank'}
            </div>
            <span className="phase-stat-number" style={{ color: clr }}>
              #{globalCounter}
            </span>
            <div className="phase-stat-sublabel">
              {globalRank >= 80 ? 'Elite — top of your club' : globalRank >= 50 ? 'Above average — well above most' : globalRank >= 25 ? 'Solid fan — showing up counts' : 'Every match matters'}
            </div>
            <div className="phase-stat-context">
              {peakMonth ? `Peak month: ${fmtMonth(peakMonth)} · ${peakMonthRange}` : ''}
            </div>
            {supermatchContext && (
              <div style={{
                marginTop: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 12,
                color: 'var(--text-muted)',
                maxWidth: 280,
                textAlign: 'center',
                animation: 'labelUp 0.4s 1.8s ease-out both',
                opacity: 0,
              }}>
                🗓 {supermatchContext}
              </div>
            )}
            {maxStreak > 1 && (
              <div style={{
                marginTop: 10,
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
                animation: 'labelUp 0.4s 2.2s ease-out both',
                opacity: 0,
              }}>
                🔥 {maxStreak} month streak {streakPeriod ? `(${streakPeriod})` : ''}
              </div>
            )}
            <Particles color={clr} />
          </div>
        )}

        {/* PERSONA phase */}
        {phase === 'persona' && (
          <div key="persona" className="phase-archetype-container">
            {matchCenterPersona && (
              <div className="phase-archetype-badge" style={{ marginBottom: 12 }}>
                {matchCenterPersona}
              </div>
            )}
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 6,
              animation: 'labelUp 0.4s 0.1s ease-out both',
              opacity: 0,
            }}>Your content type</div>
            <div className="phase-archetype-title" style={{fontSize: 'clamp(32px,8vw,48px)'}}>
              {contentDietType ? contentDietType.toUpperCase() : archetype.toUpperCase()}
            </div>
            {loyaltyClass && (
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 18,
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: 300,
                textAlign: 'center',
                animation: 'labelUp 0.5s 0.7s ease-out both',
                opacity: 0,
              }}>
                {loyaltyClass}{localeClass && localeClass !== 'Heimfan' ? ` · ${localeClass}` : ''}
              </div>
            )}
            {wrapped_card?.fan_identity_statement && (
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
                marginTop: 14,
                fontWeight: 300,
                lineHeight: 1.6,
                maxWidth: 300,
                textAlign: 'center',
                fontStyle: 'italic',
                animation: 'labelUp 0.5s 1.1s ease-out both',
                opacity: 0,
              }}>
                "{wrapped_card.fan_identity_statement}"
              </div>
            )}
            <Particles color={clr} />
          </div>
        )}

        {/* MVP phase */}
        {phase === 'mvp' && (
          <div key="mvp" className="phase-mvp-container">
            <div className="phase-mvp-label">⚽ Data-Declared Season MVP · 166 dimensions</div>
            <div className="phase-mvp-name">{mvpName.toUpperCase()}</div>
            <div className="phase-mvp-sub">{scout_report?.season_label || 'Outstanding Season'}</div>
            {mvpScore && (
              <div className="phase-mvp-score">Impact Score: {Number(mvpScore).toFixed(1)}</div>
            )}
            {scout_report?.scout_report && (
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-muted)',
                fontWeight: 300,
                lineHeight: 1.65,
                maxWidth: 320,
                textAlign: 'center',
                marginTop: 16,
                animation: 'goldSettle 0.6s 1.8s ease-out both',
                opacity: 0,
              }}>
                {scout_report.scout_report}
              </div>
            )}
            <Particles color="#f0b429" />
          </div>
        )}

        {/* Wipe transition bar */}
        {phase !== 'flash' && (
          <div key={`wipe-${key}`} className="phase-wipe" style={{ background: clr }}/>
        )}
      </div>
    </>
  )
}

// ── UTILS ──
const hexToRgb = hex => {
  const h = (hex || '').replace('#', '')
  if (h.length < 6) return '212,0,26'
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}

const safeColor = color => {
  if (!color) return null
  const c = color.replace(/^#+/, '#')
  if (c === '#FFFFFF' || c === '#ffffff' || c === '#fff') return null
  return c
}

const applyClubTheme = color => {
  const c = safeColor(color)
  if (!c) return
  document.documentElement.style.setProperty('--club-color', c)
  document.documentElement.style.setProperty('--club-color-raw', c)
  document.documentElement.style.setProperty('--club-glow', `rgba(${hexToRgb(c)},0.3)`)
}

const resetTheme = () => {
  document.documentElement.style.removeProperty('--club-color')
  document.documentElement.style.removeProperty('--club-color-raw')
  document.documentElement.style.removeProperty('--club-glow')
}

const fmt = n => {
  if (!n && n !== 0) return '0'
  return n > 999 ? `${(n/1000).toFixed(1)}K` : String(n)
}

// ── SCREEN 1: CLUB SELECT ──
function ClubSelectScreen({ onSelect }) {
  const [clubs, setClubs] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchClubs()
      .then(d => { setClubs(d.clubs || []); setLoading(false) })
      .catch(() => { setError('Could not load clubs. Check connection.'); setLoading(false) })
  }, [])

  const handleSelect = club => {
    setSelected(club.club_id)
    applyClubTheme(club.primary_color)
  }

  return (
    <div className="screen">
      <div className="hero-title">
        YOUR<br/>
        <span style={{color:'var(--accent)'}}>SEASON</span><br/>
        WRAPPED
      </div>
      <div className="hero-sub">2024/25 Bundesliga — Personalized for you</div>
      {error && <div className="error-box">{error}</div>}
      {loading && <div style={{color:'var(--text-muted)',fontSize:14}}>Loading clubs...</div>}
      {!loading && !error && (
        <>
          <div style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:12}}>
            Select Your Club
          </div>
          <div className="club-scroll">
            <div className="club-grid">
              {clubs.map(club => {
                const clr = safeColor(club.primary_color) || 'var(--accent)'
                return (
                  <div
                    key={club.club_id}
                    className={`club-card ${selected === club.club_id ? 'selected' : ''}`}
                    style={{'--club-color': clr, '--club-glow': `rgba(${hexToRgb(clr)},0.3)`}}
                    onClick={() => handleSelect(club)}
                  >
                    <span className="club-code" style={{color: clr}}>{club.three_letter_code}</span>
                    <span className="club-name-small">{club.short_name}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{marginTop:16}}>
            <button
              className="btn btn-primary"
              disabled={!selected}
              onClick={() => onSelect(clubs.find(c => c.club_id === selected))}
            >
              CONTINUE
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── SCREEN 2: USER INPUT ──
function UserInputScreen({ club, onSubmit, onBack }) {
  const [name, setName] = useState('')
  const clr = safeColor(club.primary_color) || 'var(--accent)'

  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← Back</button>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:6}}>
          Your Club
        </div>
        <div style={{fontFamily:'var(--font-display)',fontSize:36,letterSpacing:'2px',color:clr}}>
          {club.short_name}
        </div>
      </div>
      <div className="input-group">
        <label className="input-label" htmlFor="user-name">Your Name</label>
        <input
          id="user-name"
          className="input-field"
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={30}
        />
      </div>
      <button
        className="btn btn-primary"
        disabled={!name.trim()}
        onClick={() => onSubmit({ name: name.trim() })}
        style={{marginTop:16}}
      >
        GENERATE MY WRAPPED
      </button>
    </div>
  )
}

// ── LOADING SCREEN ──
function LoadingScreen() {
  const messages = [
    'Scanning 34 matchdays…',
    'Computing Impact Scores…',
    'Consulting the data…',
    'Crafting your narrative…',
  ]
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setMsgIdx(i => (i+1) % messages.length), 1800)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className="loading-screen">
      <div className="spinner" style={{borderTopColor:'var(--club-color,var(--accent))'}}/>
      <div className="loading-title">
        BUILDING<br/>
        <span style={{color:'var(--club-color,var(--accent))'}}>YOUR</span><br/>
        WRAPPED
      </div>
      <div className="loading-sub">{messages[msgIdx]}</div>
    </div>
  )
}

// ── CONFETTI ──
function Confetti({ color }) {
  const pieces = Array.from({ length: 80 }, (_, i) => {
    const colors = [color, '#f0b429', '#ffffff', '#d4001a', color + 'cc']
    const c = colors[i % colors.length]
    const left = Math.random() * 100
    const delay = Math.random() * 2.5
    const duration = 2.5 + Math.random() * 2
    const width = 6 + Math.random() * 8
    const height = 4 + Math.random() * 6
    const rotate = Math.random() * 360
    return { c, left, delay, duration, width, height, rotate }
  })
  return (
    <div className="confetti-container">
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${p.left}%`,
          width: p.width,
          height: p.height,
          background: p.c,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          transform: `rotate(${p.rotate}deg)`,
        }}/>
      ))}
    </div>
  )
}

// ── FAN TIER helper ──
function getFanTier(percentile) {
  if (percentile >= 90) return { tierLabel: 'Elite Fan',     color: 'var(--gold)' }
  if (percentile >= 70) return { tierLabel: 'Dedicated Fan', color: 'var(--club-color, var(--accent))' }
  if (percentile >= 40) return { tierLabel: 'Regular Fan',   color: 'var(--text)' }
  return                        { tierLabel: 'Casual Fan',   color: 'var(--text-muted)' }
}

// ── SCREEN 3: WRAPPED RESULT ──
function WrappedScreen({ data, club, onManagerMode, onReset, onCinematic }) {
  const { profile, mvp_analysis, scout_report, wrapped_card } = data
  const clr = safeColor(club.primary_color) || '#d4001a'
  const [showConfetti, setShowConfetti] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => { applyClubTheme(clr) }, [clr])
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [])

  const videoUrl = profile?.video_url
  const favVideoTitle = profile?.favorite_video

  // KPI fields
  const engScore           = profile?.engagement_score ?? 0
  const fanCount           = profile?.fan_count ?? 0
  const globalRankPos      = profile?.global_rank_position ?? 0
  const globalRank         = profile?.global_rank ?? 0
  const countryRank        = profile?.country_rank ?? 0
  const countryClusterSize = profile?.country_cluster_size ?? 0
  const ageRank            = profile?.age_rank ?? 0
  const ageClusterSize     = profile?.age_cluster_size ?? 0
  const ageGroup           = profile?.age_group || ''
  const matchCenterPersona = profile?.match_center_persona || ''
  const contentDietType    = profile?.content_diet_type || ''
  const arcShape           = profile?.arc_shape || ''
  const loyaltyClass       = profile?.loyalty_class || ''
  const tickerTotal        = profile?.ticker_total ?? 0
  const statsTotal         = profile?.stats_total ?? 0
  const lineupsTotal       = profile?.lineups_total ?? 0
  const completionist      = profile?.completionist || false
  const contentBalance     = profile?.content_balance_type || ''
  const peakMonth          = profile?.peak_month || ''
  const peakMonthRange     = profile?.peak_month_matchday_range || ''
  const maxStreak          = profile?.max_streak ?? 0
  const streakPeriod       = profile?.streak_period || ''
  const streakContext      = profile?.streak_context || ''
  const localeClass        = profile?.locale_class || ''
  const isInternational    = profile?.is_international || false
  const langCommunitySize  = profile?.language_community_size ?? 0
  const isRareLocale       = profile?.is_rare_locale || false
  const supermatchMonth    = profile?.supermatch_month || ''
  const supermatchContext  = profile?.supermatch_context || ''
  const isSameAsPeak       = profile?.is_same_as_peak || false
  const tablePersona       = profile?.table_persona || ''
  const planningStyle      = profile?.planning_style || ''
  const squadInterest      = profile?.squad_interest || ''
  const videoTitle         = profile?.video_title || favVideoTitle
  const isPlayedClip       = profile?.is_played_clip || false

  const { tierLabel, color: tierColor } = getFanTier(engScore)
  // Use club_rank_position if backend has it (after redeployment).
  // Fallback: derive from fan_percentile + fan_count — always available.
  // rank ≈ fanCount × (1 − percentile/100), clamped to [1, fanCount]
  const derivedRank = fanCount > 0 && engScore > 0
    ? Math.max(1, Math.round(fanCount * (1 - engScore / 100)))
    : 0
  const displayRankPos   = profile?.club_rank_position || derivedRank
  const displayRankTotal = fanCount  // rank is within the club

  const fmtMonth = (str) => {
    if (!str) return ''
    try { return new Date(str).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
    catch { return str.slice(0, 7) }
  }

  return (
    <div className="wrapped-screen">
      {showConfetti && <Confetti color={clr} />}

      {/* HERO */}
      <div className="wrapped-hero" style={{'--club-color-raw': clr}}>
        <div className="wrapped-season">Bundesliga 2024/25 · Season Wrapped</div>
        <div className="wrapped-name">{profile.user_name || 'Manager'}</div>
        <div className="wrapped-archetype">{profile.archetype || 'Football Fan'} · {club.short_name}</div>
      </div>

      <div className="wrapped-body">

        {/* VIDEO CARD — most-watched clip */}
        {videoUrl && (
          <div className="video-card">
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              onError={() => {}}
            />
            <div className="video-card-label">
              🎬 {favVideoTitle || 'Your most watched'}
            </div>
          </div>
        )}

        {/* GREETING CARD */}
        <div className="wrapped-card-physical">
          <span className="card-icon">👋</span>
          <span className="card-label">Your Season</span>
          <div className="card-text" style={{fontSize:16,fontWeight:400}}>{wrapped_card.greeting}</div>
        </div>

        {/* STATS ROW — Fan Score with tier + Club Rank + Active Months */}
        <div className="stat-row">
          <div className="stat-box">
            <span className="stat-value" style={{color: tierColor}}>{engScore}</span>
            <span className="stat-label" style={{fontSize:9}}>{tierLabel}</span>
            <span className="stat-label" style={{marginTop:2}}>Fan Score</span>
          </div>
          <div className="stat-box">
            <span className="stat-value" style={{color:clr}}>
              {displayRankPos > 0 ? `#${displayRankPos}` : '—'}
            </span>
            <span className="stat-label" style={{fontSize:9}}>of {displayRankTotal > 0 ? displayRankTotal.toLocaleString() : '?'}</span>
            <span className="stat-label" style={{marginTop:2}}>Club Rank</span>
          </div>
          <div className="stat-box">
            <span className="stat-value" style={{color:clr}}>{fmt(profile.active_months || 0)}</span>
            <span className="stat-label">Active Months</span>
          </div>
        </div>

        {/* CONTENT ROW — Videos · Stories · Articles */}
        <div className="stat-row" style={{marginBottom:12}}>
          <div className="stat-box">
            <span className="stat-value" style={{color:clr,fontSize:22}}>{fmt(profile.total_videos || 0)}</span>
            <span className="stat-label">Videos</span>
          </div>
          <div className="stat-box">
            <span className="stat-value" style={{color:clr,fontSize:22}}>{fmt(profile.total_stories || 0)}</span>
            <span className="stat-label">Stories</span>
          </div>
          <div className="stat-box">
            <span className="stat-value" style={{color:clr,fontSize:22}}>{fmt(profile.total_articles || 0)}</span>
            <span className="stat-label">Articles</span>
          </div>
        </div>

        {/* STORY CARD */}
        <div className="wrapped-card-physical">
          <span className="card-icon">📖</span>
          <span className="card-label">Story</span>
          <div className="card-text">{wrapped_card.season_story}</div>
        </div>

        {/* FAN STAT CARD */}
        <div className="wrapped-card-physical">
          <span className="card-icon">📊</span>
          <span className="card-label">Your Fan Stat</span>
          <div className="card-text">{wrapped_card.fan_stat}</div>
        </div>

        {/* HOW YOU FOLLOW FOOTBALL CARD */}
        <div className="wrapped-card-physical">
          <span className="card-icon">⚙️</span>
          <span className="card-label">How You Follow Football</span>
          <div className="card-text">{wrapped_card.tactical_identity}</div>
        </div>

        {/* MATCH CENTER IDENTITY CARD */}
        {matchCenterPersona && (
          <div className="wrapped-card-physical">
            <span className="card-icon">📡</span>
            <span className="card-label">Match Center Persona</span>
            <div className="card-text" style={{fontFamily:'var(--font-display)',fontSize:22,letterSpacing:'1px',marginBottom:8}}>
              {matchCenterPersona}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
              {[['Ticker',tickerTotal],['Stats',statsTotal],['Lineups',lineupsTotal]].map(([label, val]) => (
                <div key={label} style={{background:'rgba(255,255,255,0.05)',borderRadius:8,padding:'6px 12px',fontSize:11,color:'var(--text-muted)'}}>
                  {label}: <span style={{color:'var(--text)'}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT DIET CARD */}
        {contentDietType && (
          <div className="wrapped-card-physical">
            <span className="card-icon">🎬</span>
            <span className="card-label">Content Diet{completionist ? ' · Completionist' : ''}</span>
            <div className="card-text" style={{fontFamily:'var(--font-display)',fontSize:22,letterSpacing:'1px',marginBottom:6}}>
              {contentDietType}
            </div>
            {contentBalance && (
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>
                Balance: {contentBalance}{completionist ? ' — you consumed all content types' : ''}
              </div>
            )}
          </div>
        )}

        {/* SEASON ARC + LOYALTY CARD */}
        {arcShape && (
          <div className="wrapped-card-physical">
            <span className="card-icon">📈</span>
            <span className="card-label">Season Arc</span>
            <div className="card-text" style={{fontFamily:'var(--font-display)',fontSize:22,letterSpacing:'1px',marginBottom:6}}>
              {arcShape}
            </div>
            {loyaltyClass && (
              <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:6}}>
                Loyalty class: <span style={{color:'var(--text)'}}>{loyaltyClass}</span>
              </div>
            )}
            {maxStreak > 0 && (
              <div style={{fontSize:12,color:'var(--text-muted)'}}>
                🔥 {maxStreak}-month streak{streakPeriod ? ` (${streakPeriod})` : ''}{streakContext ? ` · ${streakContext}` : ''}
              </div>
            )}
          </div>
        )}

        {/* RANKINGS CARD — club rank + country + age */}
        {(countryRank > 0 || ageRank > 0 || displayRankPos > 0) && (
          <div className="wrapped-card-physical">
            <span className="card-icon">🌍</span>
            <span className="card-label">Community Rankings</span>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
              {displayRankPos > 0 && displayRankTotal > 0 && (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-muted)'}}>
                    Among {club.short_name} fans
                  </span>
                  <span style={{fontFamily:'var(--font-display)',fontSize:18,color:clr}}>
                    #{displayRankPos} <span style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-body)'}}>of {displayRankTotal.toLocaleString()}</span>
                  </span>
                </div>
              )}
              {countryRank > 0 && countryClusterSize > 0 && (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-muted)'}}>
                    {isInternational ? '🌐 Global fan' : '🇩🇪 Local fan'}{profile?.country ? ` · ${profile.country}` : ''}
                  </span>
                  <span style={{fontFamily:'var(--font-display)',fontSize:18,color:clr}}>
                    {countryRank}/99 <span style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-body)'}}>({countryClusterSize} fans)</span>
                  </span>
                </div>
              )}
              {ageRank > 0 && ageClusterSize > 0 && ageGroup && (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--text-muted)'}}>Age group · {ageGroup}</span>
                  <span style={{fontFamily:'var(--font-display)',fontSize:18,color:clr}}>
                    {ageRank}/99 <span style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-body)'}}>({ageClusterSize} fans)</span>
                  </span>
                </div>
              )}
              {isRareLocale && (
                <div style={{fontSize:12,color:'var(--gold)',marginTop:2}}>
                  ⭐ Rare Supporter — one of fewer than 10 fans in your locale
                </div>
              )}
              {localeClass && localeClass !== 'Heimfan' && !isRareLocale && (
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{localeClass}</div>
              )}
            </div>
          </div>
        )}

        {/* PEAK MONTH CARD */}
        {peakMonth && (
          <div className="wrapped-card-physical">
            <span className="card-icon">🗓</span>
            <span className="card-label">Your Bundesliga Month</span>
            <div className="card-text" style={{fontFamily:'var(--font-display)',fontSize:22,letterSpacing:'1px',marginBottom:6}}>
              {(() => { try { return new Date(peakMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) } catch { return peakMonth.slice(0,7) } })()}
            </div>
            {peakMonthRange && (
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>{peakMonthRange}</div>
            )}
            {supermatchContext && supermatchMonth && (
              <div style={{fontSize:12,color:'var(--text-muted)'}}>
                {isSameAsPeak ? '🎯 ' : ''}{supermatchContext}
              </div>
            )}
          </div>
        )}

        {/* FAN BEHAVIOUR SIGNALS CARD */}
        {(tablePersona || planningStyle || squadInterest) && (
          <div className="wrapped-card-physical">
            <span className="card-icon">🧬</span>
            <span className="card-label">Fan DNA</span>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:4}}>
              {tablePersona && (
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>Standings obsession</span>
                  <span style={{fontSize:12,color:'var(--text)'}}>{tablePersona}</span>
                </div>
              )}
              {planningStyle && (
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>App style</span>
                  <span style={{fontSize:12,color:'var(--text)'}}>{planningStyle}</span>
                </div>
              )}
              {squadInterest && (
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>Squad focus</span>
                  <span style={{fontSize:12,color:'var(--text)'}}>{squadInterest}</span>
                </div>
              )}
            </div>
            {wrapped_card?.fan_dna_statement && (
              <div style={{marginTop:12,fontSize:12,color:'rgba(255,255,255,0.4)',fontStyle:'italic',lineHeight:1.6}}>
                "{wrapped_card.fan_dna_statement}"
              </div>
            )}
          </div>
        )}

        {/* FAN IDENTITY STATEMENT CARD */}
        {wrapped_card?.fan_identity_statement && (
          <div className="wrapped-card-physical" style={{background:`linear-gradient(135deg, rgba(${hexToRgb(clr)},0.08) 0%, var(--surface) 100%)`}}>
            <span className="card-icon">🪪</span>
            <span className="card-label">Your Fan Identity</span>
            <div className="card-text" style={{fontSize:15,lineHeight:1.7,fontStyle:'italic'}}>
              "{wrapped_card.fan_identity_statement}"
            </div>
          </div>
        )}

        {/* VIDEO TITLE (non-Bayern fans with a title but no clip) */}
        {!videoUrl && videoTitle && (
          <div className="wrapped-card-physical">
            <span className="card-icon">🎬</span>
            <span className="card-label">Most watched</span>
            <div className="card-text">{videoTitle}</div>
          </div>
        )}

        {/* VERDICT CARD */}
        <div className="wrapped-card-physical" style={{background:`linear-gradient(135deg, rgba(${hexToRgb(clr)},0.1) 0%, var(--surface) 100%)`}}>
          <span className="card-icon">🏆</span>
          <span className="card-label">Season Verdict</span>
          <div className="card-verdict">{wrapped_card.season_verdict}</div>
        </div>

        {/* MVP */}
        <div className="section-title">Season MVP</div>
        <div className="mvp-banner">
          <span className="mvp-label">⚽ Data-Declared MVP — 166 Statistical Dimensions</span>
          <div className="mvp-name">{mvp_analysis?.mvp || (mvp_analysis?.players?.[0]?.name) || '—'}</div>
          <div className="mvp-score">{scout_report?.season_label || 'Top Performer'}</div>
          <div className="mvp-report">{scout_report?.scout_report || ''}</div>
        </div>

        {/* SHARE CARD */}
        <div className="section-title">Share</div>
        <div className="wrapped-card-physical share-card" style={{'--club-color-raw': clr, border: `1px solid ${clr}40`}}>
          <span className="card-icon">📤</span>
          <div className="share-text">{wrapped_card.share_text}</div>
          <div className="share-tag">#BundesligaWrapped · #{club.three_letter_code}</div>
        </div>

        {/* FOOTER NOTE */}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',fontSize:11,color:'var(--text-muted)',lineHeight:1.6,marginBottom:10}}>
          ⚡ Auto-generated from real DFL data · Works for all 18 Bundesliga clubs · Powered by Amazon Bedrock
        </div>

        <button className="btn btn-primary" onClick={onManagerMode} style={{marginBottom:4}}>
          TRY MANAGER MODE →
        </button>
        <div style={{fontSize:9,color:'rgba(255,255,255,0.2)',textAlign:'center',marginBottom:8,letterSpacing:'0.5px',lineHeight:1.6}}>
          WrapPlus Preview · Deep stats for Bayern · Lineup analysis for all 18 clubs
        </div>
        <button className="btn btn-ghost" style={{marginBottom:8, borderColor: clr, color: clr}}
                onClick={onCinematic}>
          🎬 CINEMATIC STORY MODE
        </button>
        <button className="btn btn-ghost" onClick={onReset}>
          TRY ANOTHER CLUB
        </button>
      </div>
    </div>
  )
}

// ── MANAGER MODE HELPERS ──

/** Parse result string e.g. "3:1" → outcome 'W'/'D'/'L' from perspective of isHome */
function getResultOutcome(result, isHome) {
  if (!result) return null
  const m = result.match(/(\d+)\s*[:\-]\s*(\d+)/)
  if (!m) return null
  const h = parseInt(m[1]), g = parseInt(m[2])
  if (h === g) return 'D'
  return isHome ? (h > g ? 'W' : 'L') : (g > h ? 'W' : 'L')
}

/** Map DFL position code/string to one of GK | DEF | MID | ATT */
function positionGroup(pos) {
  if (!pos) return 'MID'
  const p = pos.toLowerCase().replace(/[\s_\-]/g, '')
  if (['tw','gk','goalkeeper','torwart','keeper'].some(x => p === x || p.includes(x))) return 'GK'
  if (['la','ra','ms','sa','st','cf','lw','rw','fw','strk','forw','winger'].some(x => p === x || p.includes(x))) return 'ATT'
  if (['iv','lv','rv','lav','rav','lib','reb','cb','lb','rb','lwb','rwb','back','def','vert'].some(x => p === x || p.includes(x))) return 'DEF'
  return 'MID'
}

/** Group array of players into ordered position sections */
function groupPlayers(players) {
  const ORDER  = ['GK','DEF','MID','ATT']
  const LABELS = { GK:'Goalkeeper', DEF:'Defenders', MID:'Midfielders', ATT:'Attackers' }
  const buckets = { GK:[], DEF:[], MID:[], ATT:[] }
  players.forEach(p => { const g = positionGroup(p.playing_position); buckets[g].push(p) })
  return ORDER.filter(g => buckets[g].length > 0).map(g => ({ key:g, label:LABELS[g], players:buckets[g] }))
}

// ── SCREEN 4: MANAGER MODE ──
function ManagerScreen({ club, wrappedData, onBack }) {
  const [step, setStep] = useState('match') // match | bench | analysis
  const [matches, setMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchData, setMatchData] = useState(null)
  const [starter, setStarter] = useState(null)
  const [bench, setBench] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resultFilter, setResultFilter] = useState('all')

  const clr = safeColor(club.primary_color) || 'var(--accent)'

  // Load matches via fetchMatches API
  useEffect(() => {
    if (!club?.club_id) {
      setLoadingMatches(false)
      return
    }
    setLoadingMatches(true)
    setError(null)
    fetchMatches(club.club_id)
      .then(data => {
        setMatches(data.matches || [])
        setLoadingMatches(false)
      })
      .catch(() => {
        setError('Could not load matches. Please try again.')
        setLoadingMatches(false)
      })
  }, [club?.club_id])

  const handleSelectMatch = async match => {
    setSelectedMatch(match)
    setLoading(true)
    setError(null)
    try {
      const teamId = club.club_id
      const data = await fetchSubstitution(match.match_id, teamId)
      setMatchData(data)
      setStarter(null)
      setBench(null)
      setStep('bench')
    } catch (e) {
      setError('Failed to load match data. Try another match.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!starter || !bench) return
    setLoading(true)
    setError(null)
    try {
      const teamId = club.club_id
      const data = await fetchAnalyzeSub(selectedMatch.match_id, teamId, starter.person_id, bench.person_id)
      setAnalysis(data)
      setStep('analysis')
    } catch (e) {
      setError('Failed to analyze substitution. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTryAnother = () => {
    setSelectedMatch(null)
    setMatchData(null)
    setStarter(null)
    setBench(null)
    setAnalysis(null)
    setStep('match')
  }

  if (step === 'analysis' && analysis) {
    const a = analysis.analysis || analysis
    const score = a.synergy_score ?? 0
    const gaugeColor = score > 0 ? '#00c853' : score < 0 ? '#ff1744' : 'var(--text-muted)'
    const fillPct = Math.abs(score) / 10 * 50

    return (
      <div className="screen">
        <button className="back-btn" onClick={handleTryAnother} style={{marginBottom:16}}>← Try Another</button>
        <div style={{fontFamily:'var(--font-display)',fontSize:13,letterSpacing:'3px',color:'var(--text-muted)',marginBottom:20}}>
          TACTICAL ANALYSIS
        </div>

        {/* Synergy gauge — bidirectional bar */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'20px',marginBottom:12}}>
          <div style={{
            fontFamily:'var(--font-display)',
            fontSize:64,
            letterSpacing:'2px',
            color:gaugeColor,
            lineHeight:1,
            textAlign:'center',
            marginBottom:10,
            textShadow:`0 0 28px ${gaugeColor}50`,
          }}>
            {score > 0 ? `+${score}` : score}
          </div>
          {/* Bar */}
          <div style={{position:'relative',height:8,background:'var(--border)',borderRadius:4,overflow:'hidden',marginBottom:6}}>
            <div style={{position:'absolute',left:'50%',top:0,width:2,height:'100%',background:'rgba(255,255,255,0.12)',transform:'translateX(-50%)'}}/>
            {score !== 0 && (
              <div style={{
                position:'absolute',
                height:'100%',
                background:gaugeColor,
                borderRadius:4,
                boxShadow:`0 0 10px ${gaugeColor}80`,
                transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                ...(score > 0 ? {left:'50%',width:`${fillPct}%`} : {right:'50%',width:`${fillPct}%`}),
              }}/>
            )}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'rgba(255,255,255,0.25)',letterSpacing:'0.5px',marginBottom:8}}>
            <span>−10</span>
            <span style={{letterSpacing:'2px',textTransform:'uppercase',color:'var(--text-muted)'}}>Synergy Score</span>
            <span>+10</span>
          </div>
          <div style={{textAlign:'center',fontFamily:'var(--font-display)',fontSize:13,letterSpacing:'2px',color:gaugeColor}}>
            {a.manager_rating || 'DECENT MOVE'}
          </div>
        </div>

        {/* Non-Bayern disclaimer */}
        {!analysis?.has_deep_stats && (
          <div style={{
            background:'var(--surface)',
            border:'1px solid var(--border)',
            borderRadius:10,
            padding:'12px 16px',
            fontSize:13,
            color:'var(--text-muted)',
            marginBottom:12,
            lineHeight:1.6,
          }}>
            ℹ️ Deep stats available for Bayern players only. Analysis is based on lineup data.
          </div>
        )}

        {/* Bayern stat delta — only when has_deep_stats */}
        {analysis?.has_deep_stats && analysis.starter_stats && analysis.bench_stats && Object.keys(analysis.starter_stats).length > 0 && (
          <div className="wrapped-card-physical" style={{marginBottom:12}}>
            <span className="card-label" style={{color:'var(--gold)'}}>Stat Comparison</span>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'8px 8px',marginTop:10,alignItems:'center'}}>
              <div style={{fontSize:9,color:'var(--text-muted)',letterSpacing:'1px',textTransform:'uppercase'}}>
                OUT: {(analysis.starter?.name || '').split(' ').pop()}
              </div>
              <div/>
              <div style={{fontSize:9,color:'var(--text-muted)',letterSpacing:'1px',textTransform:'uppercase',textAlign:'right'}}>
                IN: {(analysis.bench_player?.name || '').split(' ').pop()}
              </div>

              <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--text-muted)'}}>{analysis.starter_stats.impact_score != null ? Number(analysis.starter_stats.impact_score).toFixed(0) : '—'}</div>
              <div style={{fontSize:8,color:'var(--text-muted)',letterSpacing:'1px',textAlign:'center'}}>IMPACT</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--gold)',textAlign:'right'}}>{analysis.bench_stats.impact_score != null ? Number(analysis.bench_stats.impact_score).toFixed(0) : '—'}</div>

              <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--text-muted)'}}>{analysis.starter_stats.xg != null ? Number(analysis.starter_stats.xg).toFixed(2) : '—'}</div>
              <div style={{fontSize:8,color:'var(--text-muted)',letterSpacing:'1px',textAlign:'center'}}>xG</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--gold)',textAlign:'right'}}>{analysis.bench_stats.xg != null ? Number(analysis.bench_stats.xg).toFixed(2) : '—'}</div>

              <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--text-muted)'}}>{analysis.starter_stats.participations_goal ?? '—'}</div>
              <div style={{fontSize:8,color:'var(--text-muted)',letterSpacing:'1px',textAlign:'center'}}>GOAL PART.</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--gold)',textAlign:'right'}}>{analysis.bench_stats.participations_goal ?? '—'}</div>
            </div>
          </div>
        )}

        <div className="narrative-card">
          <span className="narrative-label" style={{color:clr}}>Verdict</span>
          <div className="narrative-text">{a.verdict}</div>
        </div>
        <div className="narrative-card">
          <span className="narrative-label" style={{color:'var(--text-muted)'}}>Tactical Risk</span>
          <div className="narrative-text">{a.risk}</div>
        </div>
        {a.real_time_note && (
          <div className="narrative-card">
            <span className="narrative-label" style={{color:'var(--text-muted)'}}>Timing</span>
            <div className="narrative-text">{a.real_time_note}</div>
          </div>
        )}

        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',fontSize:12,color:'var(--text-muted)',marginBottom:16}}>
          {starter?.name} <span style={{color:gaugeColor}}>→</span> {bench?.name}
        </div>

        <button className="btn btn-ghost" onClick={handleTryAnother} style={{marginBottom:8}}>TRY ANOTHER</button>
        <button className="btn btn-ghost" onClick={onBack}>BACK TO WRAPPED</button>

        {/* WrapPlus disclaimer */}
        <div style={{marginTop:24,paddingTop:16,borderTop:'1px solid var(--border)',fontSize:9,color:'rgba(255,255,255,0.18)',textAlign:'center',letterSpacing:'1px',lineHeight:1.8}}>
          ⚡ MANAGER MODE · WRAPPLUS PREVIEW<br/>
          Real DFL data · AI-powered tactical analysis · Coming to all clubs in WrapPlus
        </div>
      </div>
    )
  }

  if (step === 'bench' && matchData) {
    const starters = matchData.starting_xi || matchData.starters || []
    const benchPlayers = matchData.bench || []
    const starterGroups = groupPlayers(starters)
    const benchGroups = groupPlayers(benchPlayers)

    return (
      <div className="screen">
        <button className="back-btn" onClick={() => setStep('match')} style={{marginBottom:16}}>← Back</button>
        <div style={{fontFamily:'var(--font-display)',fontSize:13,letterSpacing:'3px',color:'var(--text-muted)',marginBottom:4}}>
          MANAGER MODE
        </div>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:20}}>
          MD{matchData.match_day || selectedMatch?.match_day} · {matchData.result || ''} · {matchData.formation || ''}
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="section-title">Starting XI — tap to remove</div>
        {starterGroups.map(({ key, label, players: gp }) => (
          <div key={key} style={{marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:'2px',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',marginBottom:6}}>
              {label}
            </div>
            <div className="player-grid">
              {gp.map(p => (
                <div
                  key={p.person_id}
                  className={`player-item ${starter?.person_id === p.person_id ? 'selected-starter' : ''}`}
                  onClick={() => setStarter(starter?.person_id === p.person_id ? null : p)}
                >
                  <div className="player-number">{p.shirt_number || '—'}</div>
                  <div className="player-name">{p.name}</div>
                  <div className="player-pos">{p.playing_position || ''}</div>
                  {p.has_season_stats && (
                    <div style={{fontSize:8,color:'var(--gold)',letterSpacing:'0.5px',marginTop:3}}>★ DATA</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="section-title" style={{marginTop:20}}>Bench — tap to bring on</div>
        {benchGroups.map(({ key, label, players: gp }) => (
          <div key={key} style={{marginBottom:12}}>
            <div style={{fontSize:9,letterSpacing:'2px',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',marginBottom:6}}>
              {label}
            </div>
            <div className="player-grid">
              {gp.map(p => (
                <div
                  key={p.person_id}
                  className={`player-item ${bench?.person_id === p.person_id ? 'selected-bench' : ''}`}
                  onClick={() => setBench(bench?.person_id === p.person_id ? null : p)}
                >
                  <div className="player-number">{p.shirt_number || '—'}</div>
                  <div className="player-name">{p.name}</div>
                  <div className="player-pos">{p.playing_position || ''}</div>
                  {p.has_season_stats && (
                    <div style={{fontSize:8,color:'var(--gold)',letterSpacing:'0.5px',marginTop:3}}>★ DATA</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          className="btn btn-primary"
          disabled={!starter || !bench || loading}
          onClick={handleAnalyze}
          style={{marginTop:8}}
        >
          {loading ? 'ANALYZING…' : 'ANALYZE SUBSTITUTION'}
        </button>

        {/* WrapPlus disclaimer */}
        <div style={{marginTop:24,paddingTop:16,borderTop:'1px solid var(--border)',fontSize:9,color:'rgba(255,255,255,0.18)',textAlign:'center',letterSpacing:'1px',lineHeight:1.8}}>
          ⚡ MANAGER MODE · WRAPPLUS PREVIEW<br/>
          Real DFL data · AI-powered tactical analysis · Coming to all clubs in WrapPlus
        </div>
      </div>
    )
  }

  // step === 'match'
  const filteredMatches = resultFilter === 'all'
    ? matches
    : matches.filter(m => {
        const isHome = m.home_team_id === club.club_id
        return getResultOutcome(m.result, isHome) === resultFilter
      })

  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack} style={{marginBottom:16}}>← Back to Wrapped</button>
      <div style={{fontFamily:'var(--font-display)',fontSize:13,letterSpacing:'3px',color:'var(--text-muted)',marginBottom:4}}>
        MANAGER MODE
      </div>
      <div className="hero-title" style={{fontSize:'clamp(36px,9vw,52px)',marginBottom:8}}>
        PICK A<br/><span style={{color:clr}}>MATCH</span>
      </div>
      <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>
        Select a 2024/25 match to simulate a substitution
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && (
        <div style={{display:'flex',justifyContent:'center',padding:'16px 0'}}>
          <div className="spinner" style={{borderTopColor:clr}}/>
        </div>
      )}

      {loadingMatches && (
        <div style={{display:'flex',justifyContent:'center',padding:'32px 0'}}>
          <div className="spinner" style={{borderTopColor:clr}}/>
        </div>
      )}

      {!loadingMatches && !club?.club_id && (
        <div className="error-box">No club selected. Please go back and select a club.</div>
      )}
      {!loadingMatches && club?.club_id && matches.length === 0 && !error && (
        <div style={{color:'var(--text-muted)',fontSize:13,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px'}}>
          No matches available for this season.
        </div>
      )}

      {matches.length > 0 && (
        <>
          {/* Result filter pills */}
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {[['all','ALL'],['W','WINS'],['D','DRAWS'],['L','LOSSES']].map(([val,label]) => {
              const active = resultFilter === val
              return (
                <button
                  key={val}
                  onClick={() => setResultFilter(val)}
                  style={{
                    padding:'5px 12px',
                    borderRadius:100,
                    border:`1px solid ${active ? clr : 'var(--border)'}`,
                    background: active ? `rgba(${hexToRgb(clr)},0.15)` : 'var(--surface)',
                    color: active ? clr : 'var(--text-muted)',
                    fontSize:10,
                    letterSpacing:'1px',
                    cursor:'pointer',
                    fontFamily:'var(--font-display)',
                    transition:'all var(--transition)',
                  }}
                >
                  {label}
                </button>
              )
            })}
            {resultFilter !== 'all' && (
              <span style={{fontSize:10,color:'var(--text-muted)',alignSelf:'center',marginLeft:4}}>
                {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          <div className="match-list">
            {filteredMatches.length === 0 ? (
              <div style={{color:'var(--text-muted)',fontSize:13,padding:'14px 0',textAlign:'center'}}>
                No {resultFilter === 'W' ? 'wins' : resultFilter === 'D' ? 'draws' : 'losses'} found.
              </div>
            ) : filteredMatches.map(m => {
              const isHome = m.home_team_id === club.club_id
              const outcome = getResultOutcome(m.result, isHome)
              const outcomeColor = outcome === 'W' ? '#00c853' : outcome === 'L' ? '#ff1744' : 'var(--text-muted)'
              const isSelected = selectedMatch?.match_id === m.match_id
              return (
                <div
                  key={m.match_id}
                  className={`match-item ${isSelected ? 'selected' : ''}`}
                  style={isSelected ? {borderColor:clr, boxShadow:`0 0 12px rgba(${hexToRgb(clr)},0.3)`} : {}}
                  onClick={() => handleSelectMatch(m)}
                >
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                    <div className="match-day">MATCH DAY {m.match_day}</div>
                    {outcome && (
                      <div style={{
                        fontFamily:'var(--font-display)',
                        fontSize:11,
                        letterSpacing:'1.5px',
                        color:outcomeColor,
                        background:`${outcomeColor}18`,
                        border:`1px solid ${outcomeColor}40`,
                        borderRadius:4,
                        padding:'1px 7px',
                      }}>
                        {outcome}
                      </div>
                    )}
                  </div>
                  <div className="match-teams">{m.home_team} vs {m.guest_team}</div>
                  {m.result && (
                    <div className="match-result" style={{color:outcomeColor}}>
                      {m.result}
                      {isHome !== undefined && <span style={{color:'rgba(255,255,255,0.2)',fontSize:10}}> · {isHome ? 'Home' : 'Away'}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* WrapPlus disclaimer */}
      <div style={{marginTop:24,paddingTop:16,borderTop:'1px solid var(--border)',fontSize:9,color:'rgba(255,255,255,0.18)',textAlign:'center',letterSpacing:'1px',lineHeight:1.8}}>
        ⚡ MANAGER MODE · WRAPPLUS PREVIEW<br/>
        Real DFL data · AI-powered tactical analysis · Coming to all clubs in WrapPlus
      </div>
    </div>
  )
}

// ── APP ──
export default function App() {
  const [screen, setScreen] = useState('club')
  const [selectedClub, setSelectedClub] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const steps = { club: '1 / 3', input: '2 / 3', loading: '', reveal: '', result: '3 / 3', manager: '', presentation: '✦' }

  const handleClubSelect = club => {
    setSelectedClub(club)
    setScreen('input')
  }

  const handleSubmit = async ({ name }) => {
    setLoading(true)
    setError(null)
    setScreen('loading')
    try {
      // tactical_style removed — not derived from engagement data
      const data = await fetchWrapped(selectedClub.name, name, 'High Press')
      if (data.error) throw new Error(data.error)
      setResult(data)
      setScreen('presentation')  // go straight to cinematic story mode
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
      setScreen('input')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedClub(null)
    setResult(null)
    setError(null)
    resetTheme()
    setScreen('club')
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">BUNDES<span>LIGA</span></div>
        <div className="step-indicator">{steps[screen] || ''}</div>
      </div>

      {error && screen === 'input' && (
        <div style={{padding:'0 24px'}}>
          <div className="error-box">{error}</div>
        </div>
      )}

      {screen === 'club' && <ClubSelectScreen onSelect={handleClubSelect} />}

      {screen === 'input' && (
        <UserInputScreen
          club={selectedClub}
          onSubmit={handleSubmit}
          onBack={() => { resetTheme(); setScreen('club') }}
        />
      )}

      {screen === 'loading' && <LoadingScreen />}

      {screen === 'reveal' && result && (
        <RevealScreen
          data={result}
          club={selectedClub}
          onDone={() => setScreen('result')}
        />
      )}

      {screen === 'result' && result && (
        <WrappedScreen
          data={result}
          club={selectedClub}
          onManagerMode={() => setScreen('manager')}
          onCinematic={() => setScreen('presentation')}
          onReset={handleReset}
        />
      )}

      {screen === 'manager' && (
        <ManagerScreen
          club={selectedClub}
          wrappedData={result}
          onBack={() => setScreen('result')}
        />
      )}

      {screen === 'presentation' && result && (
        <WrappedPresentation
          data={result}
          club={selectedClub}
          onClose={() => setScreen('result')}
        />
      )}
    </div>
  )
}
