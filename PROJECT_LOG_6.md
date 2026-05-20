# Bundesliga Wrapped — Project Log v6
## Sessions 11–12: Fan Wrapped KPIs Engine + Cinematic Presentation Mode

---

## Session 11 — Fan Wrapped KPIs Engine (Backend)
**Hours:** ~8 hrs | **Status:** ✅ Complete + Deployed

### What Was Built

#### 17-task KPI pipeline in `engagement_mapper.py`

All 17 KPI signals computed from real engagement data — no cohort averages, no hardcoded values. Every signal is computed from one random real fan's own records.

**4 Global Indexes** (built once at cold start inside `build_club_index()`):
```
GLOBAL_USER_INDEX    {user_id: total_interactions}      — 2,765 entries
CLUB_COUNTRY_INDEX   {(club, country_lower): [uids]}    — cross-club+country clusters
CLUB_AGE_INDEX       {(club, age_group): [uids]}        — cross-club+age clusters
LANGUAGE_COUNTRY_INDEX {(language, country): count}    — locale community size
CLUB_INDEX           {club_name: [records]}             — mirrors return value
```

**17 KPI Signal Functions:**
| Signal | Function | Key Output Fields |
|---|---|---|
| 1 Match Center Identity | `_compute_match_center_identity()` | `match_center_persona`, `ticker_total`, `stats_total`, `lineups_total` |
| 2 Peak Month | `_compute_peak_month()` | `peak_month`, `peak_month_activity`, `peak_month_matchday_range` |
| 3 Content Diet + Completionist | `_compute_content_diet()` | `content_diet_type`, `completionist`, `content_balance_type` |
| 4 Country Cluster Rank | `_compute_country_rank()` | `country_rank`, `country_cluster_size`, `is_international` |
| 5 Age Cohort Rank | `_compute_age_rank()` | `age_rank`, `age_cluster_size` |
| 6 Global Fan Position | `_compute_global_rank()` | `global_rank`, `global_rank_position` |
| 7 Video Moment | `_compute_video_moment()` | `video_title`, `is_played_clip` |
| 8 Season Arc + Loyalty | `_compute_season_arc()` | `arc_shape`, `arc_data` (12 ints), `loyalty_class` |
| 9 Fan Identity (Bedrock) | Bedrock Stage 3 | `fan_identity_statement` |
| B League Table Devotee | `_compute_screen_view_signals()` | `table_persona`, `total_table_views` |
| C Fixture Planner | `_compute_screen_view_signals()` | `planning_style`, `home_ratio` |
| D Streak Hunter | `_compute_streak()` | `max_streak`, `streak_period`, `streak_context` |
| E International Voice | `_compute_locale_identity()` | `locale_class`, `is_rare_locale`, `language_community_size` |
| F Supermatch Month | `_compute_supermatch_month()` | `supermatch_month`, `supermatch_context`, `is_same_as_peak` |
| G Content Completionist | inside `_compute_content_diet()` | `completionist`, `content_balance_type` |
| H Profile Analyst | inside `_compute_screen_view_signals()` | `squad_interest`, `total_profile_views` |
| + Club Rank Position | inside `get_club_profile()` | `club_rank_position` |

**`aggregate_user(user_records, uid, club)`** — extended to call all 17 KPI computers in dependency order:
```
S1 → S2 → S3+G → S8+A → B+C+H → D → S6 (provides fallback global_rank) → S4 → S5 → E → S7 → F
```
All wrapped in individual `try/except` — any single failure logs a WARNING and uses safe defaults (0/''/ False), pipeline continues.

**Bedrock Stage 3 extended** (`bedrock_handler.py`):
- Receives all 17 KPI signals in `generate_wrapped_card()`
- New "Fan Identity Signals" section in prompt (4 signals: match_center_persona, peak_month, content_diet_type, arc_shape)
- New "Fan DNA context" section (global rank, loyalty, supermatch, locale, planning)
- Two new output fields: `fan_identity_statement` + `fan_dna_statement`
- Hardcoded fallbacks for both if Bedrock omits them

**Percentile rank formula:**
```
percentile_rank = floor(count_below / cluster_size × 100)  clamped [0, 99]
```

**`SEASON_HIGHLIGHTS` calendar** (YYYY-MM → narrative context):
```python
"2025-05": "Final matchday — Bayern Meister"
"2025-04": "Title race at peak — every point counts"
"2024-08": "Season opener — matchday 1 energy"
# ... 10 key months
```

**`MONTHS_2025` arc array** — 12 YYYY-MM-DD strings, Jan–Dec 2025. Arc classification:
- **Marathon Runner** — all 12 months within 50% of mean
- **Sprint Finisher** — last 3 months mean ≥ 2× first 3
- **Hibernator** — June + July both < 50% of mean
- **Rollercoaster** — none of above

**Loyalty class ladder** (arc_shape + active_months):
```
12mo + Marathon    → "Iron Fan"
12mo + Rollercoaster → "Passionate Irregular"
≤4mo + Sprint     → "Second Half Arrival"
≤4mo + Hibernator → "Selective Witness"
≥8mo              → "Season Regular"
≥5mo              → "Part-Season Fan"
else              → "Occasional Visitor"
```

#### Deployment
- numpy/scipy built for `manylinux2014_x86_64` Python 3.12
- Zipped with Python `zipfile` module (not PowerShell Compress-Archive — corrupts large zips)
- Uploaded via `aws s3 cp` + `aws lambda update-function-code` with `--profile emrys-dev`
- Lambda cold start logs now show 4 index sizes

---

## Session 12 — Frontend KPI Integration + Cinematic Presentation Mode
**Hours:** ~6 hrs | **Status:** ✅ Complete

### KPI Data Wired into Existing Screens

**`WrappedScreen` (Wrap Summary) additions:**
- Stats row redesigned: Fan Score (with tier label) · Club Rank (#N of M) · Active Months
- Second stats row: Videos · Stories · Articles
- 8 new KPI cards added:
  - Match Center Persona (with ticker/stats/lineups pill breakdown)
  - Content Diet + Completionist badge + balance type
  - Season Arc + Loyalty class + streak with Bundesliga narrative
  - Community Rankings (club rank, country rank, age rank, Rare Supporter flag)
  - Your Bundesliga Month (peak month, matchday range, supermatch context)
  - Fan DNA (table persona, planning style, squad focus + Bedrock `fan_dna_statement`)
  - Your Fan Identity (Bedrock `fan_identity_statement`)
  - Video title card for non-Bayern fans (text only, no clip)
- "How You Follow Football" card renamed from "Tactical Identity"

**Fan tier helper:**
```javascript
function getFanTier(percentile) {
  if (percentile >= 90) return { tierLabel: 'Elite Fan',     color: 'var(--gold)' }
  if (percentile >= 70) return { tierLabel: 'Dedicated Fan', color: 'var(--club-color)' }
  if (percentile >= 40) return { tierLabel: 'Regular Fan',   color: 'var(--text)' }
  return                        { tierLabel: 'Casual Fan',   color: 'var(--text-muted)' }
}
```

**Club rank fallback formula** (frontend, no redeployment needed):
```javascript
// club_rank_position is now computed in backend — but frontend derives it if absent
const derivedRank = fanCount > 0 && engScore > 0
  ? Math.max(1, Math.round(fanCount * (1 - engScore / 100)))
  : 0
const displayRankPos = profile?.club_rank_position || derivedRank
```

**Cinematic Reveal phases extended:** `flash → name → archetype → stat0 → stat1 → stat2 → global → persona → mvp → done`
- `global` phase: animated counter counting up to club rank `#N`
- `persona` phase: match_center_persona badge + content_diet_type + fan_identity_statement

### `WrappedPresentation.jsx` — New Component

7-slide cinematic story mode. Entry point: after `fetchWrapped` succeeds, app goes directly to `screen='presentation'`.

**Slide structure:**
| Slide | Content | Duration |
|---|---|---|
| 0 | Intro — name, club, archetype, fan count | 15s |
| 1 | Solari scramble board — real `total_interactions` | 15s |
| 2 | Scratch card — reveals real `match_center_persona` + KPI bars | ∞ (gated) |
| 3 | Video/Highlight — real clip (Bayern) or animated field | actual clip duration |
| 4 | Isometric pitch — 3 zones lit by ticker/stats/lineups ratios | 15s |
| 5 | Quiz — user guesses their real `content_diet_type` | ∞ (gated) |
| 6 | Export sticker bomb — loyalty_class, arc_shape, rank, fan_dna_statement | ∞ |

**Gated slides** (2, 5, 6): `isPaused = true`, never auto-advance:
- Slide 2: scratch 45% → `setIsScratched(true)` → `setTimeout(nextSlide, 1400)`
- Slide 5: user picks answer → `makeGuess()` → `setTimeout(nextSlide, 2200)`
- Slide 6: SHARE + WRAP SUMMARY buttons side by side

**Sound palette** — all frequencies ≤ 220 Hz:
```
slideIn      180→70 Hz triangle     slide transition
slideBack    90→160 Hz triangle     back navigation
flapTick     55–110 Hz pentatonic   Solari scramble (pitch = run index)
flapSettle   60→25 Hz sine          number locks in
scratch      40+pct×0.5 Hz          vinyl rumble
reveal       110/138/165/207 Hz     chord stab on scratch complete
correct      165/196/247/330 Hz     ascending arp
wrong        110/55 Hz square       dissonant descend
stickerDrop  55–75 Hz sine          impact thud per sticker
export       110/138/165/220 Hz     rising fanfare
mute         120→60 Hz triangle     click
pitchReveal  110/138/165 Hz         triple soft pulse
```
AudioContext is a module-level singleton — created once, reused.

**Progress bar** — CSS `animation` (`wpSegFill` 0%→100%) with `animation-play-state`:
- Running: normal playback
- `isPaused` or `isHolding`: `animation-play-state: paused` — bar freezes exactly

**Hold-to-pause** — `onPointerDown/Up/Leave` on phone frame div:
- Sets `isHolding` state → freezes auto-advance timer + progress bar animation
- Shows `⏸ HOLD` badge in centre while held

**Share button** — `html2canvas` screenshots the sticker card at 2× scale:
```javascript
// navigator.canShare({ files: [imageFile] }) — Instagram/WhatsApp image share
// fallback: download as bundesliga-wrapped.png
// last resort: copy shareText to clipboard
```

**Navigation:**
- Back/forward arrows always visible
- 7 progress segment pills (click to jump)
- X button → `onClose()` → `screen='result'` (Wrap Summary)
- WRAP SUMMARY button on Slide 6 → same

**CSS prefix:** all presentation styles use `.wp-` prefix to avoid collisions with existing styles.

### `App.jsx` Changes
```javascript
// After fetchWrapped succeeds:
setScreen('presentation')  // was: setScreen('reveal')

// New screens map entry:
presentation: '✦'

// New render block:
{screen === 'presentation' && result && (
  <WrappedPresentation data={result} club={selectedClub} onClose={() => setScreen('result')} />
)}

// WrappedScreen gets new onCinematic prop → 🎬 CINEMATIC STORY MODE button
```

### Dependencies Added
```
lucide-react    ^0.511.0   icon library
html2canvas     ^1.4.1     screenshot for share
```

---

## Current Architecture (End of Session 12)

```
Club Select → Name Input → Loading (API) → Cinematic Presentation (7 slides)
                                                        ↓ X or WRAP SUMMARY
                                               Wrap Summary (scroll cards)
                                                        ↓
                                               Manager Mode (drag substitution)
```

### All Screens Working
| Screen | Status |
|---|---|
| Club selector | ✅ |
| Name input | ✅ |
| Loading | ✅ |
| Cinematic presentation (7 slides) | ✅ |
| Wrap summary (full KPI cards) | ✅ |
| Manager mode | ✅ |

### Backend (Lambda) — Live
- Endpoint: `https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod`
- All 17 KPI signals computed per request
- `club_rank_position` added to every response
- Cold start: ~25–35s (loads 26,242 records + builds 5 indexes)
- Warm requests: <15s

---

## File Changes This Session

| File | Change |
|---|---|
| `backend/engagement_mapper.py` | +500 lines — 17 KPI computers, 5 global indexes, `club_rank_position` |
| `backend/bedrock_handler.py` | Extended Stage 3 prompt, `fan_identity_statement`, `fan_dna_statement` |
| `backend/lambda_handler.py` | Cold-start logging for new indexes |
| `frontend/src/App.jsx` | Direct-to-presentation routing, `WrappedPresentation` import, onCinematic prop, 8 new KPI cards in WrappedScreen |
| `frontend/src/components/WrappedPresentation.jsx` | New — 870 lines, 7-slide cinematic mode |
| `frontend/src/index.css` | +350 lines — `.wp-*` presentation styles, `wpSegFill` animation |
| `ARCHITECTURE.md` | Full rewrite — see current state |
| `.kiro/specs/fan-wrapped-kpis/tasks.md` | 17-task spec, all completed |
| `.kiro/specs/presentation/tasks.md` | 4-task spec, all completed |
| `deploy/make_zip.py` | Python zipfile-based Lambda packager |

---

## Open Items

| Item | Priority |
|---|---|
| Amplify deploy (GitHub push) | HIGH — live URL for submission |
| PRFAQ document | MEDIUM |
| 5-slide executive deck | MEDIUM |
| Demo video recording | HIGH — Day 6 artifact |
