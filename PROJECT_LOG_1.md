# Bundesliga Wrapped — Project Log v1
## Sessions 0–3: Planning → Backend → Frontend → UI Redesign
### AWS Sports AI Innovation Hackathon @ CMU-Africa

---

## Meta
- **Project:** Bundesliga Wrapped — "The Manager's Wrapped: From Passive Fan to Tactical Coach"
- **Challenge:** C1 — Bundesliga Wrapped
- **Rubric:** 34% Technical Innovation / 33% Implementation Quality / 33% Market Impact
- **Builder:** Solo — CMU-Africa Masters candidate, AI Engineering
- **Budget:** $50 AWS sandbox (~$1 projected spend at demo scale)
- **Timeline:** 6 development days × 4–5 hrs/day (~24–30 hrs)
- **Tools:** Kiro, GitHub, AWS (Amplify + Lambda + Bedrock + S3 + API Gateway)
- **Log rule:** Update at END of every session. Log failures as carefully as successes.

---

## Session 0 — Pre-Build Planning
**Hours:** ~3hrs | **Status:** ✅ Complete

### Architectural Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Challenge | C1 — Bundesliga Wrapped | Best rubric fit for solo runner. Linear pipeline, strongest market story |
| Stack | Amplify + API GW + Lambda + Bedrock + S3 | Serverless = no infra setup. All managed. Budget < $1 at demo scale |
| AI Model | Claude 3 Haiku via Bedrock | Speed + cost optimal for fan-facing narrative generation |
| Feature 1 | Tactical Substitution Simulator | Real match XML lineups + Bayern stats. Bedrock as tactical brain |
| Feature 2 | Data-Driven MVP Selector | Z-score Impact Score from 166-attribute Bayern stats XML |
| Wrapped output | Judge inputs preferences live | Demo interactivity edge — judges become the user |
| Frontend | React JSX on Amplify | Portable to RN with UI layer swap. Faster than RN setup |
| UI Theme | Dark theme (Spotify-inspired) | Professional, modern, matches design reference |

### Confirmed S3 Structure
```
Bucket: hackathon-data-514421696937
Region: eu-central-1
CRITICAL: Key prefix uses EM-DASH (–) U+2013, NOT hyphen (-)
Prefix: "Challenge 1 – Build Bundesliga Wrapped/data/"

data/1K8_Bayern.xml                                  (141KB — 34 players, 166 attrs)
data/bundesliga_wrapped_challenge_dataset.json        (21.5MB — 26,242 engagement records)
data/feeds-exports-24-25/01.04.Clubs.xml             (23KB — 18 clubs + hex colors)
data/feeds-exports-24-25/01.06.Spielplan.xml         (231KB — 306 fixtures)
data/feeds-exports-24-25/matches/                    (306 XML files, ~10–13KB each)
data/feeds-exports-24-25/players/                    (18 XML files, 28–55KB each)
```

### Key ID Relationships
```
ObjectId (players XML) = PersonId (match XML) = PlayerId (stats XML)
ClubId links: Clubs XML → Players XML → Match XML
MatchId links: Schedule XML → Match XML
user_id (engagement JSON) → favorite_club → ClubId
```

---

## Session 1 — Backend Development (Days 1–3)
**Hours:** ~12 hrs | **Status:** ✅ Complete

### Deliverables
- ✅ Lambda function with 5 routes (POST /clubs, /wrapped, /mvp, /substitution, /analyze-sub)
- ✅ XML parser for DFL data (clubs, players, schedule, matches on-demand)
- ✅ Stats processor: Z-score Impact Score (34 Bayern players, 166 dimensions)
- ✅ Engagement mapper: 26,242 records → 5 fan archetypes
- ✅ Bedrock 3-stage chain: Analyst → Scout Report → Wrapped Card Generator
- ✅ Substitution analysis pipeline: synergy scoring + tactical verdict
- ✅ API Gateway with CORS enabled
- ✅ All 5 endpoints live and verified

### Impact Score Formula (Z-score, weighted composite 0–100)
```
goal_contribution   = ParticipationsGoal + max(xGEfficiency, 0)  × 25%
attacking_output    = AssistsShotAtGoal + xG                      × 20%
physical_dominance  = dist_per90 + MaximumSpeed                   × 20%
defensive_work      = DuelsWon + BallRecoveries                   × 20%
availability        = NormalizedPlayerMinutes                      × 15%
```

### Bedrock Pipeline
```
Primary:  eu.amazon.nova-lite-v1:0
Fallback: eu.amazon.nova-pro-v1:0
Region:   eu-central-1
API:      Converse API (not invoke_model)
Max tokens: 1000

Stage 1 — Analyst:    top 3 players by Impact Score → JSON (MVP + 3 stat differentiators)
Stage 2 — Scout:      Stage 1 JSON → JSON (headline, 3-sentence report, season label)
Stage 3 — Wrapped:    user profile + Stage 2 + tactical style → JSON (narrative card)
Substitution chain:   match context + stat deltas → JSON (synergy_score, verdict, risk, rating)
```

### API Response Times (measured)
| Endpoint | Avg Response | Notes |
|---|---|---|
| POST /clubs | ~250ms | Cached cold start |
| POST /wrapped | ~3200ms | 3 Bedrock calls |
| POST /mvp | ~180ms | Pre-ranked cache |
| POST /substitution | ~600ms | On-demand match XML |
| POST /analyze-sub | ~2800ms | 1 Bedrock call |

### Lambda Module Contracts
| Module | Responsibility | Entry Point |
|---|---|---|
| config.py | All constants — S3 keys, model IDs, weights, club IDs | Imported by all |
| xml_parser.py | DFL XML → Python dicts, no stats logic | `load_all_static_data()` |
| stats_processor.py | Bayern XML → ranked players with Impact Scores | `get_ranked_players()` |
| engagement_mapper.py | Engagement JSON → user profile + archetypes | `get_user_profile()` |
| bedrock_handler.py | Context → narrative output, no S3 calls | `run_full_pipeline()` |
| lambda_handler.py | API Gateway routing + cold-start cache | `lambda_handler()` |

### Cold-Start Cache (runs once per container)
```python
STATIC_DATA    = load_all_static_data()   # clubs + players + schedule
ENGAGEMENT     = load_engagement_data()   # 26,242 records
USER_INDEX     = build_user_index(ENGAGEMENT)
RANKED_PLAYERS = get_ranked_players()     # 34 Bayern players, Z-scored
```

---

## Session 2 — Frontend Development (Days 4–5)
**Hours:** ~10 hrs | **Status:** ✅ Complete

### Deliverables
- ✅ React 19 + Vite + Tailwind CSS scaffold
- ✅ 12 React components (see table below)
- ✅ 177 unit tests (all passing)
- ✅ API integration module (5 endpoints, 10s timeout)
- ✅ App routing + global state management
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ WCAG 2.1 Level AA accessibility compliance

### Component Breakdown
| Component | Tests | Purpose |
|---|---|---|
| ClubSelector | 21 | Display 18 clubs with dynamic hex colors |
| JudgeInputForm | 32 | Name input + tactical style selector |
| WrappedCard | 14 | Personalized narrative card display |
| MVPCard | 13 | Player stats + scout report |
| MatchPicker | 14 | Match selection from 306 fixtures |
| BenchSelector | 24 | Starting XI + bench player tap-to-select |
| TacticalAnalysisCard | 10 | Synergy gauge + Bedrock analysis |
| LoadingSpinner | 27 | Loading state indicator with ARIA |
| ErrorToast | — | Error message + retry/dismiss |
| Toast | — | Clipboard copy confirmation |
| NameInput | — | Controlled text input |
| TacticalStyleSelector | — | 3-option pill selector |

### Build Metrics
- **Tests:** 177 passing, 0 failing
- **Build time:** 316ms
- **Bundle:** 227KB JS (68KB gzipped), 12KB CSS (3KB gzipped)
- **Lighthouse:** 90+ (performance, accessibility)

### API Module (src/api.js)
```javascript
const API_BASE = 'https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod';
const REQUEST_TIMEOUT = 10000;

// Uses AbortController for timeout, throws on HTTP >= 400
// 5 exports: fetchClubs, fetchWrapped, fetchMVP, fetchSubstitution, fetchAnalyzeSub
```

---

## Session 3 — UI Redesign & Dark Theme
**Hours:** ~2 hrs | **Status:** ✅ Complete

### Problem
Initial build used Tailwind utility classes that produced a light/gray UI with white backgrounds, Inter font, and no design system coherence.

### Changes Made
- ✅ Replaced Tailwind light palette with CSS custom properties design system
- ✅ Applied dark background `#0a0a0f` globally
- ✅ Converted all cards to glassmorphism `rgba(255,255,255,0.04)` with `backdrop-filter: blur(12px)`
- ✅ Typography: Bebas Neue (display/numbers) + DM Sans (body) — Inter removed
- ✅ Animations: slideUp (translateY 24px→0, 0.4s) + 100ms stagger on all cards
- ✅ Club colors applied dynamically via `applyClubTheme()` setting CSS vars at `:root`

### Design System (CSS Variables — Non-negotiable)
```css
:root {
  --bg:         #0a0a0f;
  --surface:    rgba(255,255,255,0.04);
  --border:     rgba(255,255,255,0.08);
  --text:       #f0f0f0;
  --text-muted: #888888;
  --accent:     #d4001a;
  --gold:       #f0b429;
  --green:      #00c853;
  --red:        #ff1744;
  --font-display: 'Bebas Neue', sans-serif;
  --font-body:    'DM Sans', sans-serif;
}
/* Club color applied inline: --club-color, --club-color-raw, --club-glow */
```

### Hard Rules
- NEVER white backgrounds
- NEVER default browser fonts
- NEVER tables for stats (use card grids with Bebas Neue numbers)
- ALWAYS dark glassmorphism cards on every surface
- ALWAYS 100ms stagger between sibling cards via `--card-index`

---

## Architecture Overview

### Backend Stack
```
S3 (hackathon-data-514421696937, eu-central-1)
    ↓ boto3 (cold-start cache)
AWS Lambda (Python 3.x, eu-central-1) — bundesliga-wrapped
    ├── xml_parser.py
    ├── stats_processor.py
    ├── engagement_mapper.py
    ├── bedrock_handler.py
    └── lambda_handler.py (5 routes)
    ↓ JSON/HTTPS
API Gateway (REST, /prod stage)
    https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod
```

### Frontend Stack
```
React 19 + Vite — single-page app
    ├── App.jsx (state machine, routing, API orchestration)
    ├── src/components/ (12 components)
    └── src/api.js (5 endpoint wrappers)
    ↓
AWS Amplify (static hosting, CloudFront CDN)
    amplify.yml: preBuild: npm ci → build: npm run build → artifacts: dist/
```

### Fan Archetypes (from 26,242 engagement records)
1. Tactical Mastermind
2. Data Analyst
3. The Gaffer
4. Highlight Addict
5. Match Day Devotee
6. Casual Observer

### Winning Differentiators (for judges)
1. Real DFL data — named players, zero mock stats
2. 26,242 real engagement records drive personalization
3. Z-score Impact Score across 166 statistical dimensions
4. 3-stage Bedrock chain (analyst → scout → narrator)
5. MVP declared by data before official panel
6. Real bench players from match XML
7. Live judge interaction — they get their own Wrapped
8. Club switching = one config variable (automation criterion)
9. React → React Native adoption path

---

## Project Status After Session 3

| Module | Status | Notes |
|---|---|---|
| config.py | ✅ Complete | All constants locked |
| xml_parser.py | ✅ Complete | 18 clubs, 306 matches, schedule |
| stats_processor.py | ✅ Complete | 34 players, Z-score pipeline |
| engagement_mapper.py | ✅ Complete | 26,242 records, 6 archetypes |
| bedrock_handler.py | ✅ Complete | 3-stage chain + substitution |
| lambda_handler.py | ✅ Complete | 5 routes, cold-start, CORS |
| Lambda deployment | ✅ Live | eu-central-1, S3 upload method |
| API Gateway | ✅ Live | /prod stage, all 5 routes verified |
| Frontend components | ✅ Complete | 12 components, 177 tests |
| Dark UI theme | ✅ Complete | CSS variables, glassmorphism |
| Amplify deployment | ⏳ Pending | amplify.yml ready, awaiting GitHub |

---

*Continued in PROJECT_LOG_2.md*
