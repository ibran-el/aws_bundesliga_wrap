# Bundesliga Wrapped — Architecture & Feature Methodology

> "The Manager's Wrapped: From Passive Fan to Tactical Coach"
> AWS Sports AI Innovation Hackathon @ CMU-Africa — Challenge 1

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                        │
│              React JSX · AWS Amplify (static hosting)       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS POST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (REST · /prod stage)               │
│        CORS enabled · POST only · 5 routes                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Lambda Proxy Integration
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Lambda — bundesliga-wrapped                 │
│         Python 3.12 · eu-central-1 · 512 MB · 60s          │
│                                                             │
│  xml_parser · stats_processor · engagement_mapper           │
│  bedrock_handler · lambda_handler · config                  │
│                                                             │
│  Cold-start indexes (loaded once per container):            │
│  STATIC_DATA · ENGAGEMENT · CLUB_INDEX · RANKED_PLAYERS     │
│  GLOBAL_USER_INDEX · CLUB_COUNTRY_INDEX · CLUB_AGE_INDEX    │
│  LANGUAGE_COUNTRY_INDEX                                     │
└──────┬──────────────────────────────────┬───────────────────┘
       │ boto3                            │ boto3
       ▼                                  ▼
┌──────────────┐                 ┌────────────────────┐
│     S3       │                 │   Amazon Bedrock   │
│ hackathon-   │                 │  Nova Lite primary │
│ data-514...  │                 │  Nova Pro fallback │
│              │                 │  Converse API      │
│ · DFL XML    │                 └────────────────────┘
│ · 26,242     │
│   fan records│
│ · Bayern     │
│   video clips│
└──────────────┘
```

### Live Endpoints
| Endpoint | URL |
|---|---|
| API Gateway | `https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod` |
| Frontend | AWS Amplify (React JSX, static hosting) |
| Dev server | `http://localhost:5173/` |

---

## Application Flow

```
Club Select → Name Input → Loading (API ~10–15s)
                                    ↓
                        Cinematic Presentation (7 slides)
                                    ↓ X or WRAP SUMMARY button
                            Wrap Summary (scroll cards)
                                    ↓
                            Manager Mode (substitution simulator)
```

---

## Data Sources

| Source | Content | Size |
|---|---|---|
| `1K8_Bayern.xml` | Bayern season stats — 34 players, 166 attributes | 141 KB |
| `bundesliga_wrapped_challenge_dataset.json` | App engagement — 26,242 records, 2,765 users, Jan–Dec 2025 | 21.5 MB |
| `01.04.Clubs.xml` | 18 Bundesliga clubs with hex colours | 23 KB |
| `01.06.Spielplan.xml` | 306 fixtures | 231 KB |
| `matches/*.xml` | 306 individual match files | ~10–13 KB each |
| `players/*.xml` | 18 club roster files | 28–55 KB each |
| `260210.../Goal Clips/` | 9 Bayern goal clips (9:16 vertical MP4) | — |
| `260210.../Other Single Clips/` | 5 Bayern highlight moments | — |

---

## API Routes

| Route | Method | Description | Latency |
|---|---|---|---|
| `/clubs` | POST | 18 clubs with IDs and hex colours | < 500 ms |
| `/wrapped` | POST | Full personalised Wrapped pipeline | < 15 s |
| `/mvp` | POST | Top 3 Bayern players by Impact Score | < 500 ms |
| `/substitution` | POST | Match lineup + bench for a given team | < 1 s |
| `/analyze-sub` | POST | Bedrock tactical analysis of proposed substitution | < 15 s |

---

## Feature 1 — Personalised Fan Wrapped Card

### Pipeline
```
POST /wrapped { favorite_club, user_name }
       │
       ▼
engagement_mapper.get_club_profile()
  ├─ Fuzzy-match club name (exact → case-insensitive → word match)
  ├─ Pick one random user from club pool
  ├─ Aggregate their 1–12 monthly records (real totals, not averages)
  ├─ Run all 17 KPI signal computers
  ├─ Compute club_rank_position (ordinal by total_interactions)
  └─ Compute fan_percentile (percentile within club)
       │
       ▼
bedrock_handler.run_full_pipeline()
  ├─ Stage 1 — Analyst: top 3 Bayern players → stat differentiators
  ├─ Stage 2 — Scout Narrator: differentiators → scout report
  └─ Stage 3 — Wrapped Card: fan profile + all 17 KPIs → 8-field narrative
       │
       ▼
Response: profile (all 17 KPIs + rank), mvp_analysis, scout_report, wrapped_card
```

### Fan Archetype Classification
| Archetype | Condition |
|---|---|
| Tactical Mastermind | stats_nerd AND lineup_watcher |
| Data Analyst | stats tab > home screen views |
| The Gaffer | lineup views > 3× active months |
| Highlight Addict | video views > article views |
| Match Day Devotee | match center visits > 20 |
| Casual Observer | all else |

---

## Feature 2 — Data-Driven MVP Selector (Bayern only)

### Impact Score Formula
Z-score normalised across 166 dimensions:
```
goal_contribution   = ParticipationsGoal + max(xGEfficiency, 0)   × 25%
attacking_output    = AssistsShotAtGoal + xG                       × 20%
physical_dominance  = DistanceCovered/90 + MaximumSpeed            × 20%
defensive_work      = DuelsWon + BallRecoveries                    × 20%
availability        = NormalizedPlayerMinutes                       × 15%
```

---

## Feature 3 — Tactical Substitution Simulator (Manager Mode)

Pick a real match → select starter to remove + bench player to bring on → Bedrock returns Synergy Score (−10 to +10), verdict, risk, manager rating, timing note.

---

## KPI Engine — 17 Engagement Signals (all in `engagement_mapper.py`)

### Cold-Start Indexes
| Index | Key | Value | Used By |
|---|---|---|---|
| `GLOBAL_USER_INDEX` | user_id | total_interactions | Global rank, country rank, age rank |
| `CLUB_COUNTRY_INDEX` | (club, country_lower) | [user_ids] | Country cluster rank |
| `CLUB_AGE_INDEX` | (club, age_group) | [user_ids] | Age cohort rank |
| `LANGUAGE_COUNTRY_INDEX` | (language, country) | count | Locale identity |
| `CLUB_INDEX` | club_name | [records] | Video moment, fan selection |

### Signal Table
| # | Signal | Key Output Fields |
|---|---|---|
| 1 | Match Center Identity | `match_center_persona` (Live Wire/The Gaffer/Data Analyst), `ticker_total`, `stats_total`, `lineups_total` |
| 2 | Peak Month | `peak_month`, `peak_month_activity`, `peak_month_matchday_range` |
| 3+G | Content Diet + Completionist | `content_diet_type`, `completionist`, `content_balance_type` |
| 4 | Country Cluster Rank | `country_rank`, `country_cluster_size`, `is_international` |
| 5 | Age Cohort Rank | `age_rank`, `age_cluster_size`, `age_group` |
| 6 | Global Fan Position | `global_rank`, `global_rank_position` |
| 7 | Video Moment | `video_title`, `is_played_clip` |
| 8+A | Season Arc + Loyalty | `arc_shape`, `arc_data` (12 ints), `loyalty_class` |
| 9 | Fan Identity Statement (Bedrock) | `fan_identity_statement` in wrapped_card |
| B | League Table Devotee | `table_persona`, `total_table_views` |
| C | Fixture Planner | `planning_style`, `home_ratio` |
| D | Streak Hunter | `max_streak`, `streak_period`, `streak_context` |
| E | International Voice | `locale_class`, `is_rare_locale`, `language_community_size` |
| F | Supermatch Month | `supermatch_month`, `supermatch_context`, `is_same_as_peak` |
| H | Profile Analyst | `squad_interest`, `total_profile_views` |
| + | Club Rank Position | `club_rank_position` (1-based ordinal within club) |

### Percentile Formula
```
floor(count_below / cluster_size × 100)  clamped [0, 99]
```

### Season Arc Classification (priority order)
1. **Marathon Runner** — all 12 Match Center values within [0.5×mean, 1.5×mean]
2. **Sprint Finisher** — mean(last 3 months) ≥ 2× mean(first 3)
3. **Hibernator** — June AND July both < 0.5×mean
4. **Rollercoaster** — none of above

### Loyalty Class (arc_shape + active_months)
| Condition | Label |
|---|---|
| 12mo + Marathon Runner | Iron Fan |
| 12mo + Rollercoaster | Passionate Irregular |
| ≤4mo + Sprint Finisher | Second Half Arrival |
| ≤4mo + Hibernator | Selective Witness |
| ≥8mo | Season Regular |
| ≥5mo | Part-Season Fan |
| else | Occasional Visitor |

---

## Feature 4 — Cinematic Presentation Mode (`WrappedPresentation.jsx`)

7-slide Instagram-Story-style experience. Launched immediately after API response.

### Slide Map
| Slide | Type | Content | Duration |
|---|---|---|---|
| 0 | Auto | Intro — name, club, archetype, fan count | 15s |
| 1 | Auto | Solari scramble board — real `total_interactions` + club rank | 15s |
| 2 | **Gated** | Scratch card — reveals `match_center_persona` + KPI bars | Until scratched |
| 3 | Auto | Video (Bayern real clip) or animated field + content counts | Clip duration / 15s |
| 4 | Auto | Isometric pitch — 3 zones lit by MC sub-tab ratios + signals | 15s |
| 5 | **Gated** | Quiz — user guesses real `content_diet_type` | Until answered |
| 6 | **Gated** | Export sticker bomb — SHARE + WRAP SUMMARY | User controlled |

### Gated Slide Behaviour
- Slide 2: scratch >45% → reveal → auto-advance 1.4s later
- Slide 5: tap answer → show result → auto-advance 2.2s later
- Slide 6: user leaves via SHARE or WRAP SUMMARY

### Hold-to-Pause
`onPointerDown` on phone frame → `isHolding = true` → freezes auto-advance timer + CSS `animation-play-state: paused` on progress bar → `⏸ HOLD` badge shown.

### Progress Bar
CSS `@keyframes wpSegFill` (0%→100%, `animation-timing-function: linear`) with `animation-play-state` controlled by React state. Completed slides: `width: 100%`. Gated slides: `width: 0%` until interaction.

### Share
`html2canvas` screenshots Slide 6 card at 2× scale → `navigator.canShare({ files: [imageFile] })` → opens native share sheet (Instagram Stories, WhatsApp Status). Fallback: download PNG. Last resort: copy `share_text` to clipboard.

---

## What the Wrapped Displays

### Cinematic Reveal (10-phase animation in main app)
flash → name → archetype → stat0 (total interactions) → stat1 (match center) → stat2 (fan score) → global (club rank counter) → persona (MC persona + content diet) → mvp → done

### Wrap Summary Cards (in order)
| Card | Data |
|---|---|
| Hero | Name · Archetype · Club |
| Video clip | Bayern only — real S3 presigned URL |
| Your Season | Bedrock `greeting` |
| Stats row 1 | Fan Score + tier · Club Rank · Active Months |
| Stats row 2 | Videos · Stories · Articles |
| Story | Bedrock `season_story` |
| Your Fan Stat | Bedrock `fan_stat` |
| How You Follow Football | Bedrock `tactical_identity` |
| Match Center Persona | Persona label + ticker/stats/lineups pills |
| Content Diet | Diet type + balance + Completionist badge |
| Season Arc | Arc shape + loyalty class + streak |
| Community Rankings | Club rank · Country rank · Age rank · Rare Supporter |
| Your Bundesliga Month | Peak month + matchday range + supermatch context |
| Fan DNA | Planning style · Squad interest · `fan_dna_statement` |
| Your Fan Identity | `fan_identity_statement` |
| Video title | Non-Bayern fans — text title only |
| Season Verdict | Bedrock `season_verdict` |
| Season MVP | Name · Label · Scout report |
| Share | Bedrock `share_text` + hashtags |

---

## Bedrock Stage 3 Inputs

```
Fan stats:      videos, stories, match_center, total_interactions,
                fan_score, active_months, favourite_video_title

KPI signals:    match_center_persona, peak_month, peak_month_matchday_range,
                content_diet_type, arc_shape, loyalty_class,
                global_rank_position, country_rank, age_rank,
                locale_class, is_international, planning_style,
                table_persona, supermatch_context, max_streak,
                streak_period, completionist, ticker_total, stats_total,
                lineups_total
```

Bedrock outputs 8 fields: `greeting`, `season_story`, `fan_stat`, `tactical_identity`, `season_verdict`, `share_text`, `fan_identity_statement`, `fan_dna_statement`.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Bedrock primary fails | Retry Nova Pro fallback |
| Bedrock fallback fails | Hardcoded template string |
| S3 fetch fails | Log warning, return empty dict |
| Club not found | Fuzzy word match; 404 if none |
| Null country (~3%) | `country_rank` ← `global_rank` |
| Null age_group (~2%) | `age_rank` ← `global_rank` |
| Any KPI computation exception | Log WARNING, safe defaults |
| Video URL generation fails | Return None; frontend shows text title |

---

## Budget

| Service | Cost |
|---|---|
| Amazon Bedrock (Nova Lite) | ~$0.05 |
| Lambda + S3 + API Gateway | ~$0.00 |
| **Total** | **< $1.00** |

---

## Frontend File Map

```
frontend/src/
├── App.jsx                          ← all screens inline (1,400 lines)
├── api.js                           ← 5 endpoint wrappers, 10s timeout
├── index.css                        ← design system + wp- presentation styles
├── main.jsx
└── components/
    └── WrappedPresentation.jsx      ← 7-slide cinematic mode (880 lines)
```

---

## Deployment

### Lambda
```bash
# Build (Python zipfile — not Compress-Archive)
.venv\Scripts\python.exe deploy\make_zip.py

# Upload + deploy
aws s3 cp deploy\lambda.zip s3://hackathon-data-514421696937/lambda.zip \
  --region eu-central-1 --profile emrys-dev

aws lambda update-function-code \
  --function-name bundesliga-wrapped \
  --s3-bucket hackathon-data-514421696937 \
  --s3-key lambda.zip \
  --region eu-central-1 --profile emrys-dev
```

### Frontend Dev
```bash
cd frontend && npm run dev   # http://localhost:5173
```
