# Bundesliga 2024/25 — Data Reference

This workspace contains four data sources for the Bundesliga 2024/25 season: official DFL match/season data (XML), anonymized app engagement data (JSON), and video clips (MP4).

---

## 1. DFL Season Data — `feeds-exports-24-25/`

Official Deutsche Fußball Liga data for all 18 Bundesliga clubs, 306 matches, and full player rosters. All XML files are wrapped in a `<PutDataRequest>` envelope.

### ID System

All entities are cross-referenced via DFL IDs, consistent across all files:

| Prefix | Entity | Example |
|--------|--------|---------|
| `DFL-CLU-` | Club | `DFL-CLU-00000G` |
| `DFL-MAT-` | Match | `DFL-MAT-J04034` |
| `DFL-OBJ-` | Person (player/coach/referee) | `DFL-OBJ-J00ZZ3` |
| `DFL-SEA-` | Season | `DFL-SEA-0001K8` |
| `DFL-COM-` | Competition | `DFL-COM-000001` |
| `DFL-STA-` | Stadium | `DFL-STA-000006` |
| `DFL-DAY-` | Match Day | `DFL-DAY-004C69` |

### 1.1 Clubs — `01.04.Clubs.xml`

Path: `PutDataRequest > Clubs > Club`

Metadata for all 18 clubs: `ClubId`, `ClubName`, `LongName`, `ShortName`, `ThreeLetterCode`, `StadiumId`, `StadiumName`, `Founded`, address, contact info, club colors (German name + hex RGB), and home/away/third kit colors.

| Code | Club | ClubId |
|------|------|--------|
| FCB | FC Bayern München | DFL-CLU-00000G |
| BVB | Borussia Dortmund | DFL-CLU-000007 |
| B04 | Bayer 04 Leverkusen | DFL-CLU-00000B |
| RBL | RB Leipzig | DFL-CLU-000017 |
| SGE | Eintracht Frankfurt | DFL-CLU-00000F |
| VFB | VfB Stuttgart | DFL-CLU-00000D |
| SCF | Sport-Club Freiburg | DFL-CLU-00000A |
| SVW | SV Werder Bremen | DFL-CLU-00000E |
| BMG | Borussia Mönchengladbach | DFL-CLU-000004 |
| WOB | VfL Wolfsburg | DFL-CLU-000003 |
| M05 | 1. FSV Mainz 05 | DFL-CLU-000006 |
| FCA | FC Augsburg | DFL-CLU-000010 |
| FCU | 1. FC Union Berlin | DFL-CLU-00000V |
| TSG | TSG Hoffenheim | DFL-CLU-000002 |
| HDH | 1. FC Heidenheim 1846 | DFL-CLU-000018 |
| STP | FC St. Pauli | DFL-CLU-00000H |
| BOC | VfL Bochum 1848 | DFL-CLU-00000S |
| KIE | Holstein Kiel | DFL-CLU-000N5P |

### 1.2 Schedule — `01.06.Spielplan.xml`

Path: `PutDataRequest > Fixtures > Fixture`

All 306 fixtures. Key fields: `MatchId`, `MatchDay` (1–34), `MatchType` (`matchDayFirstHalf`/`matchDaySecondHalf`), `PlannedKickoffTime` (ISO 8601 UTC), `StadiumId`, `HomeTeamId`/`GuestTeamId` with names and three-letter codes.

**Does NOT contain match results** — use the individual match files for that.

### 1.3 Players — `players/`

18 files, one per club. Filename: `01.05.<ClubId>_<SeasonId>.xml`

Path: `PutDataRequest > Objects > Object`

Per player: `ObjectId`, `Name`, `FirstName`, `LastName`, `Alias`, `ShortName`, `BirthDate` (DD.MM.YYYY), `BirthPlace`, nationality (DE/EN/ES), `Height` (cm), `Weight` (kg), `ShirtNumber`, `PlayingPosition` (DE/EN/ES), `ClubId`, `LeaveDate` (optional).

Position categories: `goalkeeper`, `defense`, `midfield`, `offense`. More specific positions only appear in match lineups.

### 1.4 Matches — `matches/`

306 files, one per match. Filename: `<MatchId>.xml`

Path: `PutDataRequest > MatchInformation`

#### General (`> General`)
`MatchId`, `MatchDay`, `PlannedKickoffTime`, `KickoffTime` (actual), `Result` (e.g. `2:3`), `HomeTeamId`/`GuestTeamId`, formation, match mode.

#### Environment (`> Environment`)
`StadiumId`, `StadiumName`, `Temperature` (°C), `AirHumidity` (%), `Precipitation`, `NumberOfSpectators`, `StadiumCapacity`, `SoldOut`, `PitchX`/`PitchY` (meters), `Roof`, `Floodlight`.

#### Teams & Lineups (`> Teams > Team > Players > Player`)
Two `<Team>` elements per match. Team-level: `TeamId`, `Role` (home/guest), `LineUp` (formation string). Per player: `PersonId`, `ShirtNumber`, `Starting` (true/false), `PlayingPosition` (tactical code), `TeamLeader`.

Tactical position codes:

| Code | Position |
|------|----------|
| TW | Goalkeeper |
| IVL/IVZ/IVR | Centre-back (left/central/right) |
| LV / RV | Left-back / Right-back |
| DML/DMR | Defensive midfield (left/right) |
| DLM/DRM | Defensive left/right midfield |
| LM / RM | Left / Right midfield |
| ZO | Central attacking midfield |
| OLM/ORM | Attacking left/right midfield |
| OHL/OHR | Attacking half-left/half-right |
| STZ | Centre forward |

Substitutes (`Starting="false"`) may lack a `PlayingPosition`; if present, it's the position played after coming on.

#### Coaching & Officials (`> Team > TrainerStaff`, `> Team > OfficialStaff`)
`PersonId`, `Role` (`headcoach`, `assistantHeadcoach`, `teammanager`, etc.), name fields.

#### Referees (`> Referees > Referee`)
`PersonId`, `Role` (`referee`, `firstAssistant`, `secondAssistant`, `fourthOfficial`, `videoReferee`, `videoRefereeAssistant`, `refereeObserver`), name fields.

#### Playing Time (`> OtherGameInformation`)
`TotalTimeFirstHalf`/`SecondHalf` and `PlayingTimeFirstHalf`/`SecondHalf` — all in milliseconds (÷ 60,000 = minutes).

### Limitations (DFL data)
- **No event data**: match files have no goals, cards, or substitution events with timestamps — only the final `Result`.
- **No pre-computed league table**: derive from the 306 match results.
- **Date formats vary**: birth/leave dates use `DD.MM.YYYY`, kickoff times use ISO 8601.

### Joining Data

| Use Case | Join Key |
|----------|----------|
| Schedule → Match details | `MatchId` → match filename |
| Club → Player roster | `ClubId` → player filename |
| Player roster → Match lineup | `ObjectId` (players) = `PersonId` (matches) |
| Match → Club info | `HomeTeamId`/`GuestTeamId` → `ClubId` |

---

## 2. FC Bayern Season Stats — `1K8_Bayern.xml`

Cumulative season statistics for FC Bayern München through matchday 34.

Path: `PutDataRequest > SeasonStatistic > TeamStatistic > PlayerStatistic`

### TeamStatistic (~159 attributes)
Aggregated team totals covering: goals & shooting (incl. `xG`, `xGEfficiency`), passing & crossing (by distance, pitch third, success rate), defending (`GoalsConceded`, `CleanSheets`), duels (air/ground, with/without ball), dribbling, discipline (cards, fouls), set pieces, goalkeeping, and physical tracking (`DistanceCovered` in meters, `MaximumSpeed` in km/h, `PlayingTimeGross`/`Net`).

### PlayerStatistic (34 players, ~166 attributes each)
Same stat categories as team level, plus: `PlayerId` (= `ObjectId` in player roster files), `PlayerFirstName`/`LastName`/`Alias`, `GoalKeeper` flag, `PlayingTime` (HH:MM:SS), `NormalizedPlayerMinutes`, `ParticipationsGoal`/`Direct`, `AssistsShotAtGoal`, `CleanSheetsComplete` (GK only).

Key notes:
- `xGEfficiency` = actual goals − xG (positive = overperformance)
- `DistanceCovered` is in meters (team total ~4,056 km)
- `MaximumSpeed` is in km/h
- Includes players who left mid-season (34 total)

---

## 3. App Engagement Data — `bundesliga_wrapped_challenge_dataset.json`

Anonymized user engagement data from the official Bundesliga app.

| Property | Value |
|----------|-------|
| Format | JSON array |
| Records | 26,242 |
| Unique users | 2,765 |
| Time range | Jan–Dec 2025 |
| Granularity | One record per user per month |

### Fields

**User profile**: `user_id` (hashed), `age_group` ("0-17"/"18-24"/"25-34"/"35-44"/"45-54"/"55+"), `country` (ISO alpha-2, 67 countries), `device_family`, `favorite_club` (39 clubs incl. 2. Bundesliga), `gender` ("male"/"female"/"other"/"none"), `language` (42 locales), `platform` ("iOS"/"Android").

**Time**: `month` (YYYY-MM-DD, first of month).

**Content**: `favorite_video_title`, `article_view_count`, `story_view_count`, `video_view_count`.

**Screen views**: `screen_view_home_count`, `screen_view_table_count`, `screen_view_profile_count`, `screen_view_match_center_total_count`, `screen_view_match_center_ticker_count`, `screen_view_match_center_stats_count`, `screen_view_match_center_lineups_count`, `screen_view_match_center_table_count`.

Key notes:
- All count fields are nullable (`null` = no recorded activity).
- `user_id` values are SHA-256 hashes wrapped in single quotes — strip quotes when processing.
- Same user can appear in up to 12 monthly records.
- `favorite_video_title` present in ~24% of records.
- This is app data only — no match scores or player stats.

---

## 4. Video Clips — `260210 Hackathon 2026 Recherche/`

Reference video clips (MP4) from the 2024/25 season, organized in subfolders:

- **Goal Clips/** — 9 individual goal clips (9:16 vertical, Kane/Musiala/Davies/Müller)
- **Other Single Clips/** — 5 non-goal moments (championship celebration, Müller's last game, beer shower, goal-line clearance)
- **SMCS-Beiträge/** — 4 social media compilations (all Kane goals, all Kane penalties, Musiala best skills)
- **Spiel-Highlights/** — 6 full match highlight packages (international HD, selected matches)


