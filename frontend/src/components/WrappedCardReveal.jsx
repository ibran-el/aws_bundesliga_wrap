import { useState, useEffect, useRef } from 'react';

/**
 * VideoCard Component
 * Renders a muted, autoplay, looping video element with fallback to title text
 * 
 * Props:
 * - videoUrl: S3 signed URL for the video
 * - textColorClass: text color class for fallback text
 */
function VideoCard({ videoUrl, textColorClass }) {
  const [videoError, setVideoError] = useState(false);

  const handleVideoError = () => {
    setVideoError(true);
  };

  if (videoError || !videoUrl) {
    // Fallback: show title text
    return (
      <div className={`text-sm md:text-base leading-relaxed ${textColorClass}`}>
        Favorite Video
      </div>
    );
  }

  return (
    <video
      src={videoUrl}
      muted
      autoPlay
      loop
      playsInline
      onError={handleVideoError}
      className="w-full rounded-lg bg-black"
      style={{ maxHeight: '300px', objectFit: 'cover' }}
    />
  );
}

/**
 * WrappedCardReveal Component
 * Orchestrates an 8-phase animated reveal sequence with state machine pattern
 * 
 * Phase Sequence:
 * 1. 'burst' (0–0.8s): Black screen 0.5s, then radial pulse from center
 * 2. 'name' (0.8–2.0s): User name types character-by-character
 * 3. 'archetype' (2.0–2.6s): Archetype badge slides up from bottom
 * 4. 'stats' (2.6–4.0s): Stat cards appear with 300ms stagger, count 0→final
 * 5. 'narrative' (4.0–5.2s): Narrative cards slide in from bottom with 200ms stagger
 * 6. 'mvp' (5.2–5.7s): MVP player name appears with gold flash + slam
 * 7. 'share' (5.7–6.5s): Share card pulses with club color glow
 * 8. 'done' (6.5+): All animations complete, full card visible and interactive
 * 
 * Props:
 * - wrappedData: { user_name, favorite_club, profile, wrapped_card, mvp_analysis }
 * - clubColor: hex color string for animations
 * - onRevealComplete: callback when reveal finishes
 * - onSkip: callback when skip button is clicked
 */
export default function WrappedCardReveal({
  wrappedData,
  clubColor,
  onRevealComplete,
  onSkip,
}) {
  // State machine: current phase
  const [phase, setPhase] = useState('burst');
  
  // Animation state for name reveal
  const [displayedName, setDisplayedName] = useState('');
  
  // Animation state for stat counters
  const [statValues, setStatValues] = useState({
    videos: 0,
    stories: 0,
    fanScore: 0,
  });

  // Refs to track animation frames and timers
  const animationFrameRef = useRef(null);
  const timerRefsRef = useRef([]);

  // Cleanup function to clear all timers and animation frames
  const clearAllTimers = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    timerRefsRef.current.forEach(timerId => clearTimeout(timerId));
    timerRefsRef.current = [];
  };

  // Helper to add a timer and track it
  const addTimer = (callback, delay) => {
    const timerId = setTimeout(callback, delay);
    timerRefsRef.current.push(timerId);
    return timerId;
  };

  if (!wrappedData || !wrappedData.wrapped_card) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No wrapped data available</p>
      </div>
    );
  }

  const {
    user_name,
    favorite_club,
    profile,
    wrapped_card,
    mvp_analysis,
  } = wrappedData;

  const {
    greeting,
    season_story,
    fan_stat,
    tactical_identity,
    season_verdict,
    share_text,
  } = wrapped_card;

  // Extract MVP player name (first player in the list)
  const mvpPlayerName = mvp_analysis?.players?.[0]?.name || 'Top Player';

  /**
   * Phase 1: Burst (0–0.8s)
   * Black screen for 0.5s, then radial pulse from center
   */
  useEffect(() => {
    if (phase !== 'burst') return;

    // Advance to next phase after 0.8s total
    const advanceTimer = addTimer(() => {
      setPhase('name');
    }, 800);

    return () => clearAllTimers();
  }, [phase]);

  /**
   * Phase 2: Name Reveal (0.8–2.0s)
   * Character-by-character typing over 1.2s
   */
  useEffect(() => {
    if (phase !== 'name') return;

    const nameLength = user_name.length;
    const totalDuration = 1200; // 1.2s
    const charDuration = totalDuration / nameLength;

    let charIndex = 0;
    const nameTimer = setInterval(() => {
      if (charIndex <= nameLength) {
        setDisplayedName(user_name.substring(0, charIndex));
        charIndex++;
      }
    }, charDuration);

    // Advance to next phase after 1.2s
    const advanceTimer = addTimer(() => {
      setDisplayedName(user_name);
      setPhase('archetype');
    }, totalDuration);

    return () => {
      clearInterval(nameTimer);
      clearAllTimers();
    };
  }, [phase, user_name]);

  /**
   * Phase 3: Archetype Badge (2.0–2.6s)
   * Badge slides up from bottom over 0.6s
   */
  useEffect(() => {
    if (phase !== 'archetype') return;

    // Advance to next phase after 0.6s
    const advanceTimer = addTimer(() => {
      setPhase('stats');
    }, 600);

    return () => clearAllTimers();
  }, [phase]);

  /**
   * Phase 4: Stat Cards (2.6–4.0s)
   * 3 stat cards appear with 300ms stagger, each counts 0→final over 0.8s
   */
  useEffect(() => {
    if (phase !== 'stats') return;

    // Target stat values (mock data for now)
    const targetStats = {
      videos: 42,
      stories: 156,
      fanScore: 87,
    };

    // Start counting after first card appears (300ms delay for stagger)
    const countStartTimer = addTimer(() => {
      const countDuration = 800; // 0.8s per card
      const startTime = performance.now();

      const countFrame = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / countDuration, 1);

        // Ease-out curve: 1 - (1-t)^3
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setStatValues({
          videos: Math.round(targetStats.videos * easeOut),
          stories: Math.round(targetStats.stories * easeOut),
          fanScore: Math.round(targetStats.fanScore * easeOut),
        });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(countFrame);
        }
      };

      animationFrameRef.current = requestAnimationFrame(countFrame);
    }, 300);

    // Advance to next phase after 1.4s (0.3s stagger + 0.8s count + 0.3s buffer)
    const advanceTimer = addTimer(() => {
      setStatValues({
        videos: 42,
        stories: 156,
        fanScore: 87,
      });
      setPhase('narrative');
    }, 1400);

    return () => clearAllTimers();
  }, [phase]);

  /**
   * Phase 5: Narrative Cards (4.0–5.2s)
   * 5 narrative cards slide in from bottom with 200ms stagger over 0.6s each
   * Total: 4 × 200ms stagger + 600ms animation = 1400ms
   */
  useEffect(() => {
    if (phase !== 'narrative') return;

    // Advance to next phase after 1.4s (4 × 200ms stagger + 0.6s animation)
    const advanceTimer = addTimer(() => {
      setPhase('mvp');
    }, 1400);

    return () => clearAllTimers();
  }, [phase]);

  /**
   * Phase 6: MVP Slam (5.2–5.7s)
   * MVP player name appears with gold flash + slam effect
   */
  useEffect(() => {
    if (phase !== 'mvp') return;

    // Advance to next phase after 0.5s
    const advanceTimer = addTimer(() => {
      setPhase('share');
    }, 500);

    return () => clearAllTimers();
  }, [phase]);

  /**
   * Phase 7: Share Pulse (5.7–6.5s)
   * Share card pulses with club color glow
   */
  useEffect(() => {
    if (phase !== 'share') return;

    // Advance to next phase after 0.8s
    const advanceTimer = addTimer(() => {
      setPhase('done');
      onRevealComplete?.();
    }, 800);

    return () => clearAllTimers();
  }, [phase, onRevealComplete]);

  /**
   * Handle skip button click: jump to 'done' phase immediately
   */
  const handleSkip = () => {
    clearAllTimers();
    setPhase('done');
    setDisplayedName(user_name);
    setStatValues({
      videos: 42,
      stories: 156,
      fanScore: 87,
    });
    onSkip?.();
  };

  /**
   * Cleanup on component unmount
   */
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  /**
   * Determine text color based on background brightness
   */
  const getTextColor = (hexColor) => {
    if (!hexColor) return 'text-gray-900';
    
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? 'text-gray-900' : 'text-white';
  };

  const textColorClass = getTextColor(clubColor);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 relative overflow-hidden">
      {/* Skip button - visible during all phases except 'idle' and 'done' */}
      {phase !== 'done' && (
        <button
          onClick={handleSkip}
          className="fixed top-5 right-5 z-50 px-4 py-2 bg-black bg-opacity-70 text-white rounded text-sm font-medium hover:bg-opacity-90 transition-all"
          aria-label="Skip animation sequence"
        >
          Skip
        </button>
      )}

      {/* Phase 1: Burst - Black screen + radial pulse */}
      {phase === 'burst' && (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          {/* Radial pulse circle */}
          <div
            className="absolute rounded-full animate-burst"
            style={{
              width: '0px',
              height: '0px',
              backgroundColor: clubColor || '#3B82F6',
              opacity: 0.8,
              animation: 'radialBurst 0.8s ease-out forwards',
              animationDelay: '0.5s',
            }}
          />
        </div>
      )}

      {/* Phase 2: Name Reveal */}
      {(phase === 'name' || phase === 'archetype' || phase === 'stats' || phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done') && (
        <div
          className={`w-full max-w-2xl rounded-lg shadow-2xl p-8 md:p-12 ${textColorClass} transition-all duration-300`}
          style={{ backgroundColor: clubColor || '#3B82F6' }}
        >
          {/* Name - appears in phase 2 */}
          {(phase === 'name' || phase === 'archetype' || phase === 'stats' || phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done') && (
            <div className="mb-8 min-h-16 flex items-center">
              <h1 className="text-4xl md:text-5xl font-bold font-mono">
                {displayedName}
                {phase === 'name' && <span className="animate-pulse">_</span>}
              </h1>
            </div>
          )}

          {/* Archetype Badge - appears in phase 3 */}
          {(phase === 'archetype' || phase === 'stats' || phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done') && (
            <div
              className={`mb-8 inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                textColorClass === 'text-white'
                  ? 'bg-white bg-opacity-20'
                  : 'bg-black bg-opacity-10'
              } animate-slideUpBadge`}
              style={{
                animation: phase === 'archetype' || phase === 'stats' || phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done'
                  ? 'slideUpBadge 0.6s ease-out forwards'
                  : 'none',
              }}
            >
              {profile?.archetype || 'Fan'}
            </div>
          )}

          {/* Stat Cards - appear in phase 4 */}
          {(phase === 'stats' || phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done') && (
            <div className="mb-8 grid grid-cols-3 gap-4">
              {[
                { label: 'Videos Watched', value: statValues.videos, index: 0 },
                { label: 'Stories Viewed', value: statValues.stories, index: 1 },
                { label: 'Fan Score', value: statValues.fanScore, index: 2 },
              ].map((stat) => (
                <div
                  key={stat.index}
                  className={`p-4 rounded-lg text-center ${
                    textColorClass === 'text-white'
                      ? 'bg-white bg-opacity-10'
                      : 'bg-black bg-opacity-10'
                  }`}
                  style={{
                    animation: phase === 'stats' || phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done'
                      ? `countUpCard 0.8s ease-out forwards`
                      : 'none',
                    animationDelay: `${stat.index * 300}ms`,
                  }}
                >
                  <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs md:text-sm opacity-75">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Narrative Cards - appear in phase 5 */}
          {(phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done') && (
            <div className="mb-8 space-y-4">
              {[
                { label: 'Greeting', text: greeting, index: 0 },
                { label: 'Season Story', text: season_story, index: 1 },
                { label: 'Fan Stat', text: fan_stat, index: 2 },
                { label: 'Tactical Identity', text: tactical_identity, index: 3 },
                { label: 'Season Verdict', text: season_verdict, index: 4 },
              ].map((card) => (
                <div
                  key={card.index}
                  className={`p-4 rounded-lg ${
                    textColorClass === 'text-white'
                      ? 'bg-white bg-opacity-10'
                      : 'bg-black bg-opacity-10'
                  }`}
                  style={{
                    animation: phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done'
                      ? `slideUpNarrative 0.6s ease-out forwards`
                      : 'none',
                    animationDelay: `${card.index * 200}ms`,
                  }}
                >
                  <h3 className="text-sm font-semibold opacity-75 mb-2">{card.label}</h3>
                  <p className="text-sm md:text-base leading-relaxed">{card.text}</p>
                </div>
              ))}

              {/* Video Card - appears if favorite_video present */}
              {profile?.favorite_video && (
                <div
                  className={`p-4 rounded-lg overflow-hidden ${
                    textColorClass === 'text-white'
                      ? 'bg-white bg-opacity-10'
                      : 'bg-black bg-opacity-10'
                  }`}
                  style={{
                    animation: phase === 'narrative' || phase === 'mvp' || phase === 'share' || phase === 'done'
                      ? `slideUpNarrative 0.6s ease-out forwards`
                      : 'none',
                    animationDelay: `${5 * 200}ms`,
                  }}
                >
                  <h3 className="text-sm font-semibold opacity-75 mb-2">Favorite Video</h3>
                  <VideoCard videoUrl={profile.favorite_video} textColorClass={textColorClass} />
                </div>
              )}
            </div>
          )}

          {/* MVP Player - appears in phase 6 */}
          {(phase === 'mvp' || phase === 'share' || phase === 'done') && (
            <div
              className="mb-8 p-6 rounded-lg text-center"
              style={{
                animation: phase === 'mvp' || phase === 'share' || phase === 'done'
                  ? `mvpSlam 0.5s ease-out forwards, goldFlash 0.5s ease-out forwards`
                  : 'none',
              }}
            >
              <p className="text-sm opacity-75 mb-2">Season MVP</p>
              <h2
                className="text-4xl md:text-5xl font-bold"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {mvpPlayerName}
              </h2>
            </div>
          )}

          {/* Share Card - appears in phase 7 */}
          {(phase === 'share' || phase === 'done') && (
            <div
              className={`p-4 rounded-lg text-center italic ${
                textColorClass === 'text-white'
                  ? 'bg-white bg-opacity-10'
                  : 'bg-black bg-opacity-10'
              }`}
              style={{
                animation: phase === 'share' || phase === 'done'
                  ? `sharePulse 0.8s ease-out forwards`
                  : 'none',
                '--club-color-shadow': `rgba(${parseInt(clubColor?.slice(1, 3), 16)}, ${parseInt(clubColor?.slice(3, 5), 16)}, ${parseInt(clubColor?.slice(5, 7), 16)}, 0.8)`,
              }}
            >
              <p className="text-sm md:text-base">"{share_text}"</p>
            </div>
          )}

          {/* Action Buttons - visible only in 'done' phase */}
          {phase === 'done' && (
            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <button
                onClick={() => {
                  // Copy share text to clipboard
                  navigator.clipboard.writeText(share_text);
                }}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  textColorClass === 'text-white'
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
                aria-label="Share wrapped card text to clipboard"
              >
                📋 Share
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes radialBurst {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 100vw;
            height: 100vh;
            opacity: 0.8;
          }
        }

        @keyframes slideUpBadge {
          0% {
            transform: translateY(100px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes countUpCard {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUpNarrative {
          0% {
            transform: translateY(50px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes mvpSlam {
          0% {
            transform: scale(0.5) translateY(50px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes goldFlash {
          0% {
            opacity: 0;
            filter: drop-shadow(0 0 0 rgba(255, 215, 0, 0));
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1));
          }
          100% {
            opacity: 1;
            filter: drop-shadow(0 0 0 rgba(255, 215, 0, 0));
          }
        }

        @keyframes sharePulse {
          0% {
            transform: scale(1);
            filter: drop-shadow(0 0 0 var(--club-color-shadow));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 0 15px var(--club-color-shadow));
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 0 var(--club-color-shadow));
          }
        }
      `}</style>
    </div>
  );
}
