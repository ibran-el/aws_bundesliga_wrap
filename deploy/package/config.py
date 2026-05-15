# backend/config.py

# ── S3 ──────────────────────────────────────────────────────────────
S3_BUCKET = "hackathon-data-514421696937"
S3_REGION = "eu-central-1"
# CRITICAL: em-dash (–) U+2013, not hyphen
S3_PREFIX = "Challenge 1 \u2013 Build Bundesliga Wrapped/data/"

S3_KEYS = {
    "bayern_stats":   S3_PREFIX + "1K8_Bayern.xml",
    "engagement":     S3_PREFIX + "bundesliga_wrapped_challenge_dataset.json",
    "clubs":          S3_PREFIX + "feeds-exports-24-25/01.04.Clubs.xml",
    "schedule":       S3_PREFIX + "feeds-exports-24-25/01.06.Spielplan.xml",
    "players_prefix": S3_PREFIX + "feeds-exports-24-25/players/",
    "matches_prefix": S3_PREFIX + "feeds-exports-24-25/matches/",
}

S3_SEASON_ID = "0001K8"

# ── BEDROCK ─────────────────────────────────────────────────────────
BEDROCK_REGION = "eu-central-1"
BEDROCK_MODEL_PRIMARY = "eu.amazon.nova-lite-v1:0"
BEDROCK_MODEL_FALLBACK = "eu.amazon.nova-pro-v1:0"
BEDROCK_MAX_TOKENS      = 1000
BEDROCK_ANTHROPIC_VER   = "bedrock-2023-05-31"

# ── MVP IMPACT SCORE WEIGHTS ─────────────────────────────────────────
IMPACT_WEIGHTS = {
    "goal_contribution":   0.25,   # ParticipationsGoal + xGEfficiency
    "attacking_output":    0.20,   # AssistsShotAtGoal + xG
    "physical_dominance":  0.20,   # DistanceCovered + MaximumSpeed
    "defensive_work":      0.20,   # duels won + defensive actions
    "availability":        0.15,   # NormalizedPlayerMinutes
}

# ── CLUB IDs (Clubs.xml confirmed) ───────────────────────────────────
CLUB_IDS = {
    "FCB": "DFL-CLU-00000G",
    "BVB": "DFL-CLU-000007",
    "B04": "DFL-CLU-00000B",
    "RBL": "DFL-CLU-000017",
    "SGE": "DFL-CLU-00000F",
    "VFB": "DFL-CLU-00000D",
    "SCF": "DFL-CLU-00000A",
    "SVW": "DFL-CLU-00000E",
    "BMG": "DFL-CLU-000004",
    "WOB": "DFL-CLU-000003",
    "M05": "DFL-CLU-000006",
    "FCA": "DFL-CLU-000010",
    "FCU": "DFL-CLU-00000V",
    "TSG": "DFL-CLU-000002",
    "HDH": "DFL-CLU-000018",
    "STP": "DFL-CLU-00000H",
    "BOC": "DFL-CLU-00000S",
    "KIE": "DFL-CLU-000N5P",
}

# Only Bayern has season stats XML
STATS_AVAILABLE_CLUBS = {"FCB"}

# ── TACTICAL STYLES ──────────────────────────────────────────────────
TACTICAL_STYLES = ["High Press", "Possession", "Counter-Attack"]

# ── FALLBACK ─────────────────────────────────────────────────────────
# Set True to skip all Bedrock calls and return pre-generated JSONs
USE_FALLBACK_RESPONSES = False
FALLBACK_DIR = "data/fallbacks/"