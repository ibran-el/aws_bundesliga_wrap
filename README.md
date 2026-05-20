# Bundesliga Wrapped

> "The Manager's Wrapped: From Passive Fan to Tactical Coach"

A Spotify Wrapped–style personalized season recap for Bundesliga fans, extended with interactive tactical features. Built for the AWS Sports AI Innovation Hackathon @ CMU-Africa (Challenge 1).

**Live app:** https://main.dfyp9mw2b5bs6.amplifyapp.com/

---

## Architecture

```
┌─────────────────────────────────────────┐
│  AWS Amplify (React JSX · static host)  │
│  https://main.dfyp9mw2b5bs6.amplifyapp.com/
└──────────────┬──────────────────────────┘
               │ HTTPS POST
               ▼
┌─────────────────────────────────────────┐
│   API Gateway  (REST · /prod stage)     │
│   6 routes · POST only · CORS enabled   │
└──────────────┬──────────────────────────┘
               │ Lambda Proxy Integration
               ▼
┌─────────────────────────────────────────┐
│  AWS Lambda  bundesliga-wrapped         │
│  Python 3.12 · eu-central-1 · 512 MB   │
│                                         │
│  xml_parser · stats_processor           │
│  engagement_mapper · bedrock_handler    │
│  lambda_handler · config                │
│                                         │
│  Cold-start indexes (once per container)│
│  STATIC_DATA · ENGAGEMENT · CLUB_INDEX  │
│  RANKED_PLAYERS · GLOBAL_USER_INDEX     │
│  CLUB_COUNTRY_INDEX · CLUB_AGE_INDEX    │
└──────┬──────────────────────┬───────────┘
       │ boto3                │ boto3
       ▼                      ▼
┌─────────────┐      ┌────────────────────┐
│     S3      │      │  Amazon Bedrock    │
│ hackathon-  │      │  Nova Lite primary │
│ data-514... │      │  Nova Pro fallback │
│             │      │  Converse API      │
│ DFL XML     │      └────────────────────┘
│ 26,242 fan  │
│ records     │
│ Video clips │
└─────────────┘
```

---

## Features

### 1 — Personalized Wrapped Card
Fan selects their club and enters their name. The system pulls a real engagement profile from 26,242 Bundesliga app records, then runs a 3-stage Amazon Bedrock chain (Nova Lite) to generate:
- Archetype classification (Tactical Mastermind, Data Analyst, The Gaffer, Highlight Addict, Match Day Devotee, Casual Observer)
- 17 KPI signals — club rank, country rank, age cohort rank, content diet, season arc, loyalty class, streak, peak month, and more
- Bedrock-written narrative: greeting, season story, fan stat, tactical identity, season verdict, shareable social text

The result plays as a 7-slide cinematic Instagram-Story experience before dropping into a full scrollable Wrap Summary card.

### 2 — Data-Driven MVP Leaderboard
Z-score normalized Impact Score across 34 Bayern players and 166 statistical dimensions. Five-component weighted composite:

```
goal_contribution   = ParticipationsGoal + max(xGEfficiency, 0)   × 25%
attacking_output    = AssistsShotAtGoal + xG                       × 20%
physical_dominance  = DistanceCovered/90 + MaximumSpeed            × 20%
defensive_work      = DuelsWon + BallRecoveries                    × 20%
availability        = NormalizedPlayerMinutes                       × 15%
```

Two-stage Bedrock chain (Analyst → Scout Narrator) produces a ranked top-3 with a witty scout report and shareable headline.

### 3 — Manager Mode / WrapPlus (Tactical Substitution Simulator)
Fan picks a real 2024/25 match, selects a starting player to remove, and chooses a bench player to bring on. Amazon Bedrock returns:
- Synergy Score (−10 to +10) with bidirectional gauge
- Two-sentence tactical rationale
- Risk assessment and manager rating
- Timing recommendation

Deep stat comparison grid (Impact Score, xG, goal participations) available for Bayern players. Lineup-level analysis available for all 18 clubs.

---

## Setup & Run

> **Note:** No data files are stored in this repository. All DFL XML feeds and the engagement JSON are read at runtime from the private S3 bucket `hackathon-data-514421696937`. Judges with AWS sandbox access and the `emrys-dev` profile can run the full stack locally.

### Backend

**Prerequisites:** Python 3.12, AWS credentials configured as profile `emrys-dev`.

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
.venv\Scripts\python.exe -m pip install boto3 numpy

# Run a quick smoke test (reads from S3 — requires AWS access)
.venv\Scripts\python.exe -c "from backend.config import S3_BUCKET; print(S3_BUCKET)"
```

**Build and deploy Lambda:**

```bash
# Build the zip (uses Python zipfile module — not PowerShell Compress-Archive)
.venv\Scripts\python.exe deploy\make_zip.py

# Upload zip to S3
aws s3 cp deploy\lambda.zip s3://hackathon-data-514421696937/lambda.zip \
  --region eu-central-1 --profile emrys-dev

# Deploy to Lambda
aws lambda update-function-code \
  --function-name bundesliga-wrapped \
  --s3-bucket hackathon-data-514421696937 \
  --s3-key lambda.zip \
  --region eu-central-1 --profile emrys-dev
```

> **numpy note:** The package in `deploy/package/` was built for `manylinux2014_x86_64` (Linux Lambda runtime). Do not replace it with a locally-installed numpy wheel built for Windows.

### Frontend

**Prerequisites:** Node.js 18+.

```bash
cd frontend

# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Production build (outputs to frontend/dist/)
npm run build

# Preview production build locally
npm run preview
```

The frontend connects to the live API Gateway endpoint by default (`api.js` — `API_BASE` constant). No environment variable setup needed for demo use.

---

## API Endpoints

Base URL: `https://o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod`

All endpoints: `POST`, `Content-Type: application/json`.

| Path | Required body fields | Response shape |
|---|---|---|
| `/clubs` | _(empty)_ | `{ clubs: [{club_id, name, short_name, three_letter_code, primary_color, secondary_color}] }` |
| `/wrapped` | `favorite_club` (string) | `{ user_name, favorite_club, tactical_style, profile, mvp_analysis, scout_report, wrapped_card }` |
| `/mvp` | _(empty)_ | `{ club, note, players: [{name, impact_score, goal_participations, xg, xg_efficiency, distance_per90_km, max_speed_kmh}] }` |
| `/matches` | `team_id` (DFL club ID) | `{ matches: [{match_id, match_day, home_team, home_team_id, guest_team, guest_team_id, result, kickoff}] }` |
| `/substitution` | `match_id`, `team_id` | `{ match_id, team_id, match_day, result, formation, starting_xi, bench }` |
| `/analyze-sub` | `match_id`, `team_id`, `starter_person_id`, `bench_person_id` | `{ starter, bench_player, has_deep_stats, starter_stats, bench_stats, analysis }` |

`/wrapped` optional fields: `user_name` (string), `tactical_style` (`"High Press"` \| `"Possession"` \| `"Counter-Attack"`).

Response latency: `/clubs`, `/mvp`, `/matches` < 500 ms (cached at cold start). `/wrapped`, `/analyze-sub` < 15 s (includes Bedrock). `/substitution` < 1 s.

---

## Data Sources

All data is read at runtime from S3. Nothing is committed to this repository.

| Bucket | `hackathon-data-514421696937` (eu-central-1) |
|---|---|
| **Key prefix** | `Challenge 1 – Build Bundesliga Wrapped/data/` |

> **⚠ em-dash warning:** The S3 key prefix uses an em-dash (–, U+2013), not a hyphen (-). Using a hyphen will produce a `NoSuchKey` error. See `backend/config.py` — `S3_PREFIX`.

| File | Size | Content |
|---|---|---|
| `1K8_Bayern.xml` | 141 KB | Bayern München 2024/25 season stats — 34 players, 166 attributes |
| `bundesliga_wrapped_challenge_dataset.json` | 21.5 MB | Bundesliga app engagement — 26,242 records, 2,765 users, Jan–Dec 2025 |
| `feeds-exports-24-25/01.04.Clubs.xml` | 23 KB | 18 Bundesliga clubs with hex colours and IDs |
| `feeds-exports-24-25/01.06.Spielplan.xml` | 231 KB | 306-fixture 2024/25 schedule |
| `feeds-exports-24-25/matches/*.xml` | ~10–13 KB each | 306 individual match files (fetched on-demand) |
| `feeds-exports-24-25/players/*.xml` | 28–55 KB each | 18 club roster files |
| `260210.../Goal Clips/` | — | 9 Bayern goal clips (9:16 vertical MP4, 2024/25) |
| `260210.../Other Single Clips/` | — | 5 Bayern highlight moment clips |

**Key ID relationships across files:**
```
ObjectId (players XML) = PersonId (match XML) = PlayerId (stats XML)
ClubId:  Clubs XML ↔ Players XML ↔ Match XML
MatchId: Schedule XML ↔ Match XML
```

---

## AWS Services

| Service | Role | Region |
|---|---|---|
| AWS Lambda | Backend compute — single function, 6 routes, cold-start cache | eu-central-1 |
| Amazon S3 | Data store — DFL XML feeds, engagement JSON, video clips, Lambda zip | eu-central-1 |
| Amazon API Gateway | REST proxy — 6 POST routes, CORS enabled | eu-central-1 |
| Amazon Bedrock (Nova Lite / Nova Pro) | 3-stage narrative chain + substitution analysis | eu-central-1 |
| AWS Amplify | Frontend static hosting — React JSX | eu-central-1 |

---

## Known Limitations

- **Bayern-only deep stats.** Rich season statistics (xG, distance covered, max speed, Impact Score) are only available for FC Bayern München. The DFL data package includes a stats XML for Bayern only. All 18 clubs are supported for Wrapped profiles and match lineup analysis; the stat comparison grid in Manager Mode shows a "limited stats" notice for non-Bayern players.
- **Club cohort profiles, not individual user profiles.** The engagement dataset contains no mechanism to identify individual demo users by name. All `/wrapped` requests are served from a randomly-selected real fan in the requested club's cohort. Stats shown (videos, stories, match center visits, etc.) are genuine — they belong to a real fan from that club's data pool.
- **No per-match MVP.** Only cumulative 2024/25 season stats exist in the DFL feed. Match-level MVP is not possible.
- **Video clips are Bayern-only.** All MP4 clips in S3 are Bayern München content. Non-Bayern fans see the video title as text; no clip is played.
- **Cold start: ~25–35 s.** Lambda loads 26,242 engagement records and builds five in-memory indexes on first invocation per container. Warm requests are < 15 s.

---

## Team & Submission

**Hackathon:** AWS World Sports Innovation Cup 2026 — Challenge 1: Bundesliga Wrapped  
**Team:** ibran-el  
**GitHub:** https://github.com/ibran-el/aws_bundesliga_wrap  
**Live app:** https://main.dfyp9mw2b5bs6.amplifyapp.com/

Submission artifacts (zip): `github_link.txt`, `presentation_video.mp4`, `executive_summary.pdf`, `prfaq.pdf`.
