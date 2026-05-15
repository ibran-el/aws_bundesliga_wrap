# Bundesliga Wrapped — Project Living Log
## "The Manager's Wrapped: From Passive Fan to Tactical Coach"
### AWS Sports AI Innovation Hackathon @ CMU-Africa

---

## Meta
- **Last Updated:** Session 1 — Pre-build
- **Builder:** Solo — CMU-Africa Masters candidate, AI Engineering
- **Challenge:** C1 — Bundesliga Wrapped
- **Rubric:** 34% Technical Innovation / 33% Implementation Quality / 33% Market Impact
- **Budget:** $50 AWS sandbox
- **Timeline:** 6 development days × 4–5 hrs/day (~24–30 hrs)
- **Tools:** Kiro, GitHub, AWS (Amplify + Lambda + Bedrock + S3 + API Gateway)

---

## How to Use This Log
- Update at the END of every build session
- Be honest — log failures as carefully as successes
- Every architectural decision goes here with the reasoning
- Every open question gets a status: OPEN / RESOLVED / DEFERRED
- This file is submitted as part of the GitHub repo

---

## Session Log

### Session 0 — Pre-Build Planning (Current)
**Date:** Pre-hackathon
**Hours:** ~3hrs across conversation
**Status:** Planning complete. Awaiting S3 data confirmation.

#### Decisions Made
| Decision | Choice | Reasoning |
|---|---|---|
| Challenge selection | C1 — Bundesliga Wrapped | Best rubric fit for solo runner. Linear pipeline, no multiplayer requirement, strongest market story |
| Stack | Amplify + API Gateway + Lambda + Bedrock + S3 | Serverless = no infra setup time. All managed services. Budget < $1 at demo scale |
| AI model | Claude 3 Haiku via Bedrock | Speed + cost optimal for fan-facing narrative generation |
| Feature 1 | Tactical Substitution Simulator | Uses real match XML lineups + Bayern stats. Bedrock as tactical brain |
| Feature 2 | Data-Driven MVP Selector | Z-score normalized Impact Score from 166-attribute Bayern stats XML |
| Wrapped output | Judge inputs own preferences live | Gives demo interactivity edge. Judges become the user |
| Real-time approach | JS polling every 30s | No WebSockets needed. Simulates live match progression safely |
| Math scope | Z-score, weighted composite, per-90 normalization, cosine similarity, convex hull if time permits | Appropriate for AI Engineering background. No model training |
| Frontend framework | React JSX on Amplify (not plain HTML, not React Native) | Portable to RN with UI layer swap only. Faster than RN setup. Deployable on Amplify. Explicitly pitch adoption path to judges |
| PRFAQ | Yes — submit Day 5 | Free Market Impact score boost. 30 min investment. |

#### Challenges Encountered
| Challenge | Impact | Mitigation | Status |
|---|---|---|---|
| 3D tracking data assumed to exist in C1 | High — entire feature pipeline designed on wrong data | Re-read DATA_REFERENCE.md carefully. Corrected architecture | RESOLVED |
| bundesliga_wrapped_challenge_dataset.json returned 404 | Medium — couldn't confirm data structure | S3 key uses em-dash (–) not hyphen (-). Copy command had wrong character | RESOLVED |
| S3 bucket listing returned empty | Medium — unknown data file structure | Region was unset. Set eu-central-1 explicitly. Re-ran copy. | RESOLVED |
| Bayern stats only (no equivalent for 17 other clubs) | Medium — automation criterion at risk | Confirmed: no other stats XMLs exist. Strategy: Bayern as showcase, roster+lineup for all 18 clubs | RESOLVED |
| S3 key em-dash vs hyphen | High — silent failure on all S3 calls | Always use: `Challenge 1 – Build Bundesliga Wrapped` with em-dash in all boto3 calls | RESOLVED |

#### Open Questions
| ID | Question | Priority | Status |
|---|---|---|---|
| OQ-001 | What is the exact S3 key structure for C1 data? | Critical | RESOLVED — prefix uses em-dash: `Challenge 1 – Build Bundesliga Wrapped` |
| OQ-002 | Do stats XMLs exist for clubs other than Bayern? | High | RESOLVED — NO. Only `1K8_Bayern.xml`. Other clubs: roster + lineup data only |
| OQ-003 | Is player identity named or anonymized in match XMLs? | High | RESOLVED — named (FirstName, LastName in player XMLs, PersonId links to match) |
| OQ-004 | Are bench players included in match XML tracking? | High | RESOLVED — yes, Starting="false" players listed in match XML |
| OQ-005 | RESOLVED: Claude 3 Haiku confirmed active. Model ID: anthropic.claude-3-haiku-20240307-v1:0|
| OQ-006 | Does engagement JSON contain stats for other clubs beyond Bayern fans? | Medium | RESOLVED — yes, 39 clubs including 2. Bundesliga |
| OQ-007 | Documentation PDF exists in S3 — contains additional judging criteria? | High | CLOSED — download and read on Day 1 build |

## Confirmed S3 Structure
```
Bucket: hackathon-data-514421696937
Region: eu-central-1

CRITICAL: Key prefix uses EM-DASH (–) not hyphen (-):
"Challenge 1 – Build Bundesliga Wrapped/data/"

Confirmed files:
  data/1K8_Bayern.xml                          (141KB)
  data/bundesliga_wrapped_challenge_dataset.json (21.5MB)
  data/feeds-exports-24-25/01.04.Clubs.xml     (23KB)
  data/feeds-exports-24-25/01.06.Spielplan.xml (231KB)
  data/feeds-exports-24-25/matches/            (306 XML files, ~10-13KB each)
  data/feeds-exports-24-25/players/            (18 XML files, 28-55KB each)
  documentation/Challenge 1 - Bundesliga Wrapped.pdf (112KB) ← READ THIS
  260210 Hackathon 2026 Recherche/             (MP4 video clips)

NO season stats files for clubs other than Bayern confirmed.
All 18 player roster XMLs confirmed present.
```

### Confirmed Stack
```
S3 (XML + JSON data)
    ↓
Lambda — xml_parser.py
Lambda — stats_processor.py
Lambda — engagement_mapper.py
Lambda — bedrock_handler.py (2-stage chain)
    ↓
API Gateway (REST POST)
    ↓
Amplify — index.html (single file)
```

### Data Flow
```
DFL XMLs → xml_parser.py → player/match dicts
Bayern XML → stats_processor.py → Z-score Impact Scores
Engagement JSON → engagement_mapper.py → user Wrapped profile
All three → substitution_engine.py → context bundle
Context bundle → bedrock_handler.py → narrative output
```

### Key Data Relationships
```
ObjectId (players XML) = PersonId (match XML) = PlayerId (stats XML)
ClubId links: Clubs XML → Players XML → Match XML
MatchId links: Schedule XML → Match XML (for results)
user_id (engagement JSON) → favorite_club → links to ClubId
```

---

## Feature Specifications

### Feature 1 — Tactical Substitution Simulator
**Status:** Designed. Not built.

**Inputs:**
- Outgoing player: PersonId, tactical position, playing time, season stats
- Incoming player: PersonId, tactical position, season stats
- Match context: minute, score, formation string, match day

**Processing:**
- Parse match XML for real bench players (Starting="false")
- Load season stats for both players from Bayern XML
- Compute stat delta vectors (xG/90, DistanceCovered/90, duel win %)
- Bundle context → Bedrock

**Bedrock output:**
- Tactical Synergy Score delta (-10 to +10)
- 2-sentence rationale grounded in real stats
- One risk/weakness the substitution introduces

**Known limitation:** Rich stat comparison only works for Bayern players currently. Universal fallback = lineup-level analysis from match XML only.

---

### Feature 2 — Data-Driven MVP Selector
**Status:** Designed. Not built.

**Impact Score Components (Z-score normalized):**
| Component | Fields | Weight |
|---|---|---|
| Goal contribution | ParticipationsGoal + xGEfficiency | 25% |
| Attacking output | AssistsShotAtGoal + xG | 20% |
| Physical dominance | DistanceCovered + MaximumSpeed | 20% |
| Defensive work | Duels won + defensive actions | 20% |
| Availability | NormalizedPlayerMinutes | 15% |

**Bedrock chain:**
- Stage 1: Analyst → JSON top 3 stat differentiators
- Stage 2: Narrator → 3-sentence Scout Report (witty, shareable)

**Known limitation:** Bayern only until other club stats confirmed in S3.

---

### Wrapped Output — Personalized Coaching Card
**Status:** Designed. Not built.

**Inputs:**
- Judge/user types: name, favorite club, favorite player
- Judge selects: preferred playing style, tactical preference
- Session data: substitutions made, MVP picks, synergy scores

**Bedrock generates:**
- Tactical archetype label
- Season narrative paragraph
- Shareable card text
- MVP prediction accuracy vs official result

---

## Self-Audit Log

### Audit 1 — Pre-Build (Session 0)
**Date:** Pre-hackathon

**Errors caught before building:**
1. Designed Feature 1 around 3D X,Y,Z tracking data that does not exist in C1
   - Evidence: DATA_REFERENCE.md confirms C1 has no positional tracking data
   - Impact if uncaught: 2 development days wasted, no working feature
   - Fix: Redesigned around match XML lineups + Bayern season stats

2. Treated mock JSON as acceptable substitute for real data
   - Evidence: Challenge spec explicitly provides real data — mock data = lower innovation score
   - Fix: All features now use confirmed real data sources only

3. Understated Bayern-only stats limitation
   - Evidence: Only `1K8_Bayern.xml` exists in confirmed data spec
   - Impact: Automation criterion (required by challenge) at risk
   - Fix: Deferred to S3 data inspection. Match XMLs provide universal fallback.

4. Ignored engagement JSON as primary Wrapped dataset
   - Evidence: DATA_REFERENCE.md describes it as the core C1 dataset (26,242 records)
   - Fix: Engagement JSON now drives the personalized Wrapped output

**Current confidence level:** Medium. Architecture is sound but two critical unknowns remain (OQ-001, OQ-002).

---

## Budget Tracker
| Service | Projected | Actual | Notes |
|---|---|---|---|
| Lambda | <$0.01 | TBD | |
| S3 | <$0.01 | TBD | |
| API Gateway | <$0.50 | TBD | |
| Bedrock Haiku | ~$0.05 | TBD | 200 prompts × 500 tokens |
| Amplify | $0.00 | TBD | Free tier |
| **Total** | **<$1.00** | **TBD** | **of $50 available** |

---

## Daily Build Log

### Day 1 — 2026-05-13
**Target:** AWS setup + Bedrock access confirmed + S3 data structure mapped
**Actual:** All three gates passed. Venv + boto3 installed. S3 bucket
confirmed (hackathon-data-514421696937, eu-central-1). Claude 3 Haiku
responding on first attempt — no fallback model needed. config.py written
with all constants, em-dash key, model ID, weights, club IDs. Git repo
initialized locally with .gitignore blocking data/, credentials, venv.
**Blockers:** None
**Commits:** Day 1: config.py locked, S3+Bedrock gates passed, Haiku confirmed

#### Resolved This Session
- OQ-005 → RESOLVED: Claude 3 Haiku active. Model: anthropic.claude-3-haiku-20240307-v1:0
- Option C (pre-generated fallbacks) eliminated. Live Bedrock confirmed within budget.

### Day 2 — 2026-05-13
**Target:** xml_parser.py + stats_processor.py working locally
**Actual:** Both modules complete and tested. All 5 tests pass.
- xml_parser.py: clubs(18), players(58 Bayern), schedule(306), match parsing ✓
- stats_processor.py: 34-player Z-score pipeline ✓
- MVP: Michael Olise (77.02) | Kane (72.46) | Kimmich (64.12)
- Bug caught + fixed: player filename pattern missing DFL-SEA- prefix
  Correct pattern: 01.05.<ClubId>_DFL-SEA-0001K8.xml
**Blockers:** None
**Commits:** Day 2: xml_parser + stats_processor tested, all gates pass

   #### Design Decision — MVP Scope
   **Decision:** Season MVP only. Per-match MVP dropped.
   **Reasoning:** Match XMLs contain no per-match player stat events.
   Only cumulative season stats available in 1K8_Bayern.xml.
   **Framing for judges:** "Season MVP declared by data before the
   official award panel — based on 34-matchday cumulative profile
   across 166 statistical dimensions."
   **Limitation statement:** Per-match MVP not possible with available
   DFL data feed. Noted honestly in README and executive summary.

### Day 3 — 2026-05-14
**Target:** engagement_mapper.py + bedrock_handler.py
**Actual:** Both modules complete. 3-stage pipeline passing.
- engagement_mapper: 26,242 records loaded, 5,291 Bayern cohort,
  5 archetypes, cohort vs individual flag added
- bedrock_handler: Switched to Converse API + Nova Lite primary,
  Nova Pro fallback. invoke_model removed. BEDROCK_ANTHROPIC_VER
  now unused — commented out in config.py
- Full pipeline: Olise MVP, Scout Report, Wrapped Card generated ✓
- Bug identified: shots_assisted mislabeled as "assists" in prompt —
  fixed in player_summaries field name
**Blockers:** None
**Commits:**

### Day 4 — 2026-05-16
**Target:** Lambda wiring + API Gateway + full pipeline end-to-end
**Actual:** All gates passed. Full HTTP pipeline live.
- Lambda deployed via S3 (direct CLI upload failed — zip too large)
- Windows→Linux numpy fix: --platform manylinux2014_x86_64
- API Gateway live: o5rl18o91h.execute-api.eu-central-1.amazonaws.com/prod
- /clubs, /mvp, /wrapped, /substitution all routed
- Cohort profile fuzzy match fixed via partial word matching
- Full Wrapped card returned over HTTP with correct archetype,
  personalized narrative, MVP analysis, scout report
- Known issues: active_months = cohort size (cosmetic for demo),
  emoji encoding in share_text (frontend renders correctly)
**Blockers:** None
**Commits:** Day 4: Lambda + API Gateway live, full pipeline confirmed

### Day 5 — [DATE TBD]
**Target:** Amplify frontend + business model + 5-slide deck
**Actual:** TBD
**Blockers:** TBD
**Commits:** TBD

### Day 6 — [DATE TBD]
**Target:** Hardening + fallbacks + demo video + submission
**Actual:** TBD
**Blockers:** TBD
**Commits:** TBD

---

## Mitigation Strategies

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Bedrock API timeout during demo | Medium | High | Pre-generated fallback JSON for all 3 output types |
| S3 data copy incomplete | Medium | High | Download files locally as backup, re-upload to own bucket |
| Bayern-only stats limit reusability score | High | Medium | Derive basic stats (minutes, appearances) from match XMLs for all 18 clubs |
| Lambda cold start delays demo | Low | Medium | Pre-warm Lambda once before judges arrive |
| Bedrock model access not approved | Low | High | Request on Day 1. Fallback: Amazon Nova Lite (also in sandbox) |
| Frontend looks unpolished | Medium | Medium | Use club hex colors from XML + one CSS card template |
| Judge interaction breaks live | Low | High | Pre-generate 3 archetype cards as fallback display |

---

## Winning Differentiators — Running List
1. Real DFL data throughout — named players, real stats, no mock data
2. App engagement JSON drives genuine personalization (26,242 real records)
3. Z-score normalized Impact Score across full 34-player Bayern cohort
4. 2-stage Bedrock prompt chain (analyst → narrator)
5. MVP declared by data before the official panel announces
6. Real bench players from match XML power the substitution simulator
7. Live judge interaction — they input preferences, get their own Wrapped
8. Club switching = one config variable (automation criterion met)

---
*This log is a living document. Update every session. Commit with code.*
