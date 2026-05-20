# backend/engagement_mapper.py
"""
Loads and processes the Bundesliga app engagement dataset.

DATA REFERENCE:
  - 26,242 records, 2,765 unique users, Jan–Dec 2025
  - One record per user per month (up to 12 records per user)
  - user_id: SHA-256 hash wrapped in single quotes — strip before use
  - favorite_club: 39 clubs including 2. Bundesliga
  - All count fields are nullable (null = no activity recorded, not zero)
  - favorite_video_title: present in ~24% of records only
  - App data only — no match scores, no player stats

Design:
  - Pick one RANDOM real user from the selected club's records
  - Aggregate their individual monthly records (NOT cohort average)
  - Compute their Fan Score as a percentile rank within their club
  - This gives every Wrapped a genuinely different, honest profile
"""

import boto3
import json
import math
import random
from config import S3_BUCKET, S3_REGION, S3_KEYS

s3 = boto3.client('s3', region_name=S3_REGION)

# ── GLOBAL KPI INDEXES (populated by build_club_index at cold start) ─
GLOBAL_USER_INDEX: dict = {}      # {user_id: total_interactions}
CLUB_COUNTRY_INDEX: dict = {}     # {(club, country_lower): [user_id, ...]}
CLUB_AGE_INDEX: dict = {}         # {(club, age_group): [user_id, ...]}
LANGUAGE_COUNTRY_INDEX: dict = {} # {(language, country): distinct_user_count}
CLUB_INDEX: dict = {}             # {club_name: [records]} — mirrors return value

# ── CONSTANTS FOR KPI VIDEO + LOCALE COMPUTATION ─────────────────────

# Bayern club name variants (lowercase) — used by Story 7 and Story E
BAYERN_CLUB_NAMES_SET = {
    'fc bayern münchen', 'fc bayern munich', 'bayern münchen',
    'bayern munich', 'fcb',
}

# Keywords from VIDEO_MAP in lambda_handler — used for S3 clip matching in Story 7
BAYERN_VIDEO_KEYWORDS = [
    'kane', 'musiala', 'jamal', 'davies', 'müller', 'muller',
    'meister', 'champion', 'bier', 'beer', 'hat-trick',
]

# Bayern community video title cache (populated lazily on first Bayern request)
_BAYERN_COMMUNITY_VIDEO_CACHE: dict = {}


# ── LOADER ───────────────────────────────────────────────────────────

def load_engagement_data() -> list[dict]:
    """
    Fetches full engagement JSON from S3.
    Returns raw list of 26,242 records.
    Call once at Lambda cold start.

    DATA REFERENCE: all count fields are nullable — normalise None → 0
    for numerics, None → '' for strings at load time.
    user_id values are SHA-256 hashes wrapped in single quotes — strip quotes.
    """
    resp = s3.get_object(Bucket=S3_BUCKET, Key=S3_KEYS["engagement"])
    raw  = resp['Body'].read()
    data = json.loads(raw)

    if not isinstance(data, list):
        print(f"[engagement_mapper] ERROR: engagement data is not a list")
        return []
    if not data:
        print(f"[engagement_mapper] ERROR: engagement data is empty")
        return []

    STRING_FIELDS = [
        'user_id', 'favorite_club', 'age_group', 'country',
        'gender', 'platform', 'language', 'favorite_video_title',
        'device_family', 'month',
    ]
    INT_FIELDS = [
        'article_view_count', 'story_view_count', 'video_view_count',
        'screen_view_home_count', 'screen_view_table_count',
        'screen_view_profile_count', 'screen_view_match_center_total_count',
        'screen_view_match_center_ticker_count',
        'screen_view_match_center_stats_count',
        'screen_view_match_center_lineups_count',
        'screen_view_match_center_table_count',
    ]
    for record in data:
        # Strip single quotes from user_id (DATA REFERENCE: "SHA-256 hashes wrapped in single quotes")
        uid = record.get('user_id') or ''
        record['user_id'] = uid.strip("'")

        for f in STRING_FIELDS:
            if f != 'user_id' and record.get(f) is None:
                record[f] = ''

        for f in INT_FIELDS:
            if record.get(f) is None:
                record[f] = 0

    print(f"[engagement_mapper] loaded {len(data)} records (nulls normalised)")
    return data


# ── INDEX BUILDERS ───────────────────────────────────────────────────

def build_club_index(data: list[dict]) -> dict:
    """
    Indexes records by favorite_club and populates all global KPI indexes
    in a single pass.
    Returns: {club_name: [record, ...]}

    DATA REFERENCE: 39 clubs in dataset (incl. 2. Bundesliga).
    Clubs.xml has 18 clubs — mismatch is expected and handled by fuzzy match.
    """
    global GLOBAL_USER_INDEX, CLUB_COUNTRY_INDEX, CLUB_AGE_INDEX, LANGUAGE_COUNTRY_INDEX, CLUB_INDEX

    index = {}          # {club: [records]}
    uid_totals = {}     # {user_id: total_interactions} — accumulator
    country_seen = {}   # {(club, country_lower): set of uids}
    age_seen = {}       # {(club, age_group): set of uids}
    locale_seen = {}    # {(language, country): set of uids}

    for record in data:
        club = record.get('favorite_club', '')
        if not club:
            continue

        # Existing club index
        if club not in index:
            index[club] = []
        index[club].append(record)

        uid = record.get('user_id', '')
        if not uid:
            continue

        # Accumulate total_interactions per uid
        interactions = (
            (record.get('article_view_count') or 0) +
            (record.get('story_view_count') or 0) +
            (record.get('video_view_count') or 0)
        )
        uid_totals[uid] = uid_totals.get(uid, 0) + interactions

        # Country cluster
        country_raw = record.get('country', '') or ''
        country_lower = country_raw.lower()
        cc_key = (club, country_lower)
        if cc_key not in country_seen:
            country_seen[cc_key] = set()
        country_seen[cc_key].add(uid)

        # Age cluster
        age_group = record.get('age_group', '') or ''
        ca_key = (club, age_group)
        if ca_key not in age_seen:
            age_seen[ca_key] = set()
        age_seen[ca_key].add(uid)

        # Language+country locale
        language = record.get('language', '') or ''
        lc_key = (language, country_raw)
        if lc_key not in locale_seen:
            locale_seen[lc_key] = set()
        locale_seen[lc_key].add(uid)

    # Write accumulated totals to global index
    GLOBAL_USER_INDEX = uid_totals

    # Convert seen-sets to sorted lists
    CLUB_COUNTRY_INDEX = {k: sorted(v) for k, v in country_seen.items()}
    CLUB_AGE_INDEX = {k: sorted(v) for k, v in age_seen.items()}
    LANGUAGE_COUNTRY_INDEX = {k: len(v) for k, v in locale_seen.items()}

    # Store club index in module-level global too
    CLUB_INDEX = index

    print(f"[engagement_mapper] club index built: {len(index)} clubs")
    print(f"[engagement_mapper] GLOBAL_USER_INDEX: {len(GLOBAL_USER_INDEX)} users")
    print(f"[engagement_mapper] CLUB_COUNTRY_INDEX: {len(CLUB_COUNTRY_INDEX)} clusters")
    print(f"[engagement_mapper] CLUB_AGE_INDEX: {len(CLUB_AGE_INDEX)} clusters")
    print(f"[engagement_mapper] LANGUAGE_COUNTRY_INDEX: {len(LANGUAGE_COUNTRY_INDEX)} locale combos")
    return index


def build_user_groups(records: list[dict]) -> dict:
    """
    Groups a club's records by user_id.
    Returns: {user_id: [record, ...]}

    DATA REFERENCE: same user can appear in up to 12 monthly records.
    """
    groups = {}
    for r in records:
        uid = r.get('user_id', '')
        if not uid:
            continue
        if uid not in groups:
            groups[uid] = []
        groups[uid].append(r)
    return groups


# ── INDIVIDUAL USER AGGREGATION ───────────────────────────────────────

def aggregate_user(user_records: list[dict], uid: str = '', club: str = '') -> dict:
    """
    Aggregates one user's monthly records into a single profile.
    All stats are REAL TOTALS for this specific user — not averages.

    Args:
        user_records: List of monthly engagement records for one user.
        uid:  User ID string (SHA-256 hash, quotes already stripped).
              Used by KPI computers that perform cross-user ranking
              (Stories 4, 5, 6).  Defaults to '' (skips rank lookups).
        club: Canonical club name from the engagement dataset.
              Used by KPI computers that scope rankings to a club
              (Stories 4, 5) and for video-clip matching (Story 7).
              Defaults to '' (skips club-scoped lookups).

    DATA REFERENCE: one record per user per month, up to 12 records.
    Count fields are nullable → already normalised to 0 at load time.
    favorite_video_title present in ~24% of records — use most frequent.
    """
    if not user_records:
        return {}

    base = user_records[0]

    def total(field):
        return sum(r.get(field) or 0 for r in user_records)

    total_articles     = total('article_view_count')
    total_stories      = total('story_view_count')
    total_videos       = total('video_view_count')
    total_match_center = total('screen_view_match_center_total_count')
    total_home         = total('screen_view_home_count')
    total_stats_tab    = total('screen_view_match_center_stats_count')
    total_lineups_tab  = total('screen_view_match_center_lineups_count')
    total_interactions = total_articles + total_stories + total_videos
    active_months      = len(user_records)

    # DATA REFERENCE: favorite_video_title present in ~24% of records
    # Use the most frequent non-empty title across the user's months
    video_titles = [r['favorite_video_title']
                    for r in user_records if r.get('favorite_video_title')]
    favorite_video = (max(set(video_titles), key=video_titles.count)
                      if video_titles else None)

    # Archetype — derived from this specific user's behaviour ratios
    is_stats_nerd     = total_stats_tab > total_home
    is_lineup_watcher = total_lineups_tab > (active_months * 3)  # >3 lineup views/month
    is_video_fan      = total_videos > total_articles

    archetype = _derive_archetype(
        is_stats_nerd, is_lineup_watcher, is_video_fan,
        total_match_center, total_interactions,
    )

    profile = {
        # Real user totals — presented as "you" in the Wrapped
        'total_articles':      total_articles,
        'total_stories':       total_stories,
        'total_videos':        total_videos,
        'total_match_center':  total_match_center,
        'total_interactions':  total_interactions,
        'active_months':       active_months,
        'favorite_video':      favorite_video,

        # Identity from first record (stable across months)
        'country':    base.get('country', ''),
        'platform':   base.get('platform', ''),
        'age_group':  base.get('age_group', ''),
        'gender':     base.get('gender', ''),
        'language':   base.get('language', ''),

        # Archetype and signals
        'archetype':          archetype,
        'is_stats_nerd':      is_stats_nerd,
        'is_lineup_watcher':  is_lineup_watcher,
        'is_video_fan':       is_video_fan,

        # Fan score placeholder — filled in by get_club_profile
        'engagement_score': 0,
        'fan_percentile':   0,
    }

    # ── KPI SIGNAL COMPUTATION ─────────────────────────────────────────
    # Safe defaults — all KPI keys present even if computation fails
    kpi_defaults = {
        # Story 1
        'ticker_total': 0, 'stats_total': 0, 'lineups_total': 0,
        'match_center_persona': '',
        # Story 2
        'peak_month': '', 'peak_month_activity': 0, 'peak_month_matchday_range': '',
        # Story 3 + G
        'content_diet_type': '', 'content_total_articles': 0,
        'content_total_stories': 0, 'content_total_videos': 0,
        'completionist': False, 'content_balance_type': '',
        # Story 8 + A
        'arc_shape': '', 'arc_data': [0]*12, 'loyalty_class': '',
        # Stories B + C + H
        'total_table_views': 0, 'total_home_views': 0, 'total_profile_views': 0,
        'table_persona': '', 'home_ratio': 0.0, 'planning_style': '', 'squad_interest': '',
        # Story D
        'max_streak': 0, 'streak_period': '', 'streak_context': '',
        # Story 6
        'global_rank': 0, 'global_rank_position': 0,
        # Story 4
        'country_rank': 0, 'country_cluster_size': 0, 'is_international': False,
        # Story 5
        'age_rank': 0, 'age_cluster_size': 0,
        # Story E
        'language_community_size': 0, 'is_rare_locale': False, 'locale_class': '',
        # Story 7
        'video_title': None, 'is_played_clip': False,
        # Story F
        'supermatch_month': '', 'supermatch_context': '', 'is_same_as_peak': False,
    }
    profile.update(kpi_defaults)

    # Story 1 — Match Center Identity
    try:
        profile.update(_compute_match_center_identity(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S1: {e}")

    # Story 2 — Peak Month
    try:
        profile.update(_compute_peak_month(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S2: {e}")

    # Story 3 + G — Content Diet + Completionist
    try:
        profile.update(_compute_content_diet(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S3: {e}")

    # Story 8 + A — Season Arc + Loyalty Certificate
    try:
        profile.update(_compute_season_arc(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S8: {e}")

    # Stories B + C + H — Screen View Signals
    try:
        profile.update(_compute_screen_view_signals(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING BCH: {e}")

    # Story D — Streak Hunter
    try:
        profile.update(_compute_streak(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING D: {e}")

    # Story 6 — Global Fan Position (must run before S4/S5 — provides fallback global_rank)
    try:
        profile.update(_compute_global_rank(uid, total_interactions))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S6: {e}")

    global_rank_val = profile.get('global_rank', 0)

    # Story 4 — Country Cluster Rank
    try:
        country_val = profile.get('country', '')
        profile.update(_compute_country_rank(uid, club, country_val, global_rank_val))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S4: {e}")

    # Story 5 — Age Cohort Rank
    try:
        age_group_val = profile.get('age_group', '')
        profile.update(_compute_age_rank(uid, club, age_group_val, global_rank_val))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S5: {e}")

    # Story E — Locale Identity (International Voice)
    try:
        profile.update(_compute_locale_identity(user_records))
    except Exception as e:
        print(f"[engagement_mapper] WARNING E: {e}")

    # Story 7 — Video Moment
    try:
        profile.update(_compute_video_moment(user_records, club))
    except Exception as e:
        print(f"[engagement_mapper] WARNING S7: {e}")

    # Story F — Supermatch Month
    try:
        peak_month_val = profile.get('peak_month', '')
        profile.update(_compute_supermatch_month(user_records, peak_month_val))
    except Exception as e:
        print(f"[engagement_mapper] WARNING F: {e}")

    return profile


def _derive_archetype(stats_nerd, lineup_watcher,
                      video_fan, match_center, total) -> str:
    """
    Maps individual behavioural signals to one of 6 fan archetypes.
    Thresholds based on individual behaviour, not community averages.
    """
    if total == 0:
        return "Casual Observer"
    if stats_nerd and lineup_watcher:
        return "Tactical Mastermind"
    if stats_nerd:
        return "Data Analyst"
    if lineup_watcher:
        return "The Gaffer"
    if video_fan:
        return "Highlight Addict"
    if match_center > 20:
        return "Match Day Devotee"
    return "Casual Observer"


# ── KPI STORY 1 — MATCH CENTER IDENTITY ──────────────────────────────

def _compute_match_center_identity(user_records: list[dict]) -> dict:
    """
    Story 1: Derives Match Center persona from ticker/stats/lineups sub-scores.
    Uses strict dominance: a score must exceed the SUM of the other two to win.
    Tiebreak default (including all-zero): 'Live Wire'.

    Returns: ticker_total, stats_total, lineups_total, match_center_persona
    """
    ticker_total  = sum(r.get('screen_view_match_center_ticker_count') or 0 for r in user_records)
    stats_total   = sum(r.get('screen_view_match_center_stats_count') or 0 for r in user_records)
    lineups_total = sum(r.get('screen_view_match_center_lineups_count') or 0 for r in user_records)

    if ticker_total > stats_total + lineups_total:
        persona = "Live Wire"
    elif lineups_total > ticker_total + stats_total:
        persona = "The Gaffer"
    elif stats_total > ticker_total + lineups_total:
        persona = "Data Analyst"
    else:
        persona = "Live Wire"  # tiebreak default (covers all-zero and equal values)

    return {
        'ticker_total':        ticker_total,
        'stats_total':         stats_total,
        'lineups_total':       lineups_total,
        'match_center_persona': persona,
    }


# ── KPI STORY 8 + A — SEASON ARC + LOYALTY CERTIFICATE ───────────────

# Jan–Dec 2025 as YYYY-MM-DD first-of-month strings
MONTHS_2025 = [
    "2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01",
    "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01",
    "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01",
]


def _compute_season_arc(user_records: list[dict]) -> dict:
    """
    Story 8: Classifies the user's 12-month Match Center engagement pattern.
    arc_data is always exactly 12 integers (Jan–Dec 2025), zero for missing months.
    Arc shape priority: Marathon Runner → Sprint Finisher → Hibernator → Rollercoaster.

    Story A (Loyalty Certificate): combines arc_shape with active_months count
    to produce a loyalty class label.

    Returns: arc_shape, arc_data (list of 12 ints), loyalty_class
    """
    month_map = {
        r.get('month', ''): (r.get('screen_view_match_center_total_count') or 0)
        for r in user_records
    }
    arc_data = [month_map.get(m, 0) for m in MONTHS_2025]

    # Mean of non-zero values; use 1 if all zero to avoid division by zero
    non_zero = [v for v in arc_data if v > 0]
    mean = sum(non_zero) / len(non_zero) if non_zero else 1

    # Arc shape classification — first match wins
    first3_mean = sum(arc_data[0:3]) / 3
    last3_mean  = sum(arc_data[9:12]) / 3
    sprint_ok   = (last3_mean >= 2 * first3_mean) if first3_mean > 0 else (last3_mean > 0)

    if all(0.5 * mean <= v <= 1.5 * mean for v in arc_data):
        arc_shape = "Marathon Runner"
    elif sprint_ok:
        arc_shape = "Sprint Finisher"
    elif arc_data[5] < 0.5 * mean and arc_data[6] < 0.5 * mean:
        arc_shape = "Hibernator"
    else:
        arc_shape = "Rollercoaster"

    # Story A — Loyalty Certificate
    active_months = len(user_records)
    if active_months == 12 and arc_shape == "Marathon Runner":
        loyalty_class = "Iron Fan"
    elif active_months == 12 and arc_shape == "Rollercoaster":
        loyalty_class = "Passionate Irregular"
    elif active_months <= 4 and arc_shape == "Sprint Finisher":
        loyalty_class = "Second Half Arrival"
    elif active_months <= 4 and arc_shape == "Hibernator":
        loyalty_class = "Selective Witness"
    elif active_months >= 8:
        loyalty_class = "Season Regular"
    elif active_months >= 5:
        loyalty_class = "Part-Season Fan"
    else:
        loyalty_class = "Occasional Visitor"

    return {
        'arc_shape':    arc_shape,
        'arc_data':     arc_data,
        'loyalty_class': loyalty_class,
    }


# ── PERCENTILE COMPUTATION ────────────────────────────────────────────

def _percentile_rank(user_interactions: int, cluster_uids: list[str]) -> int:
    """
    New percentile helper for KPI rank computations (Stories 4, 5, 6).
    Returns floor(count_below / cluster_size * 100) clamped to [0, 99].

    cluster_uids: list of user_ids in the cluster (including the target user).
    Looks up each uid's total_interactions from GLOBAL_USER_INDEX.
    Empty cluster guard: returns 0.

    Differs from compute_percentile() which uses round() and clamps to [1,99].
    This uses floor() and clamps to [0, 99] per requirements glossary.
    """
    cluster_size = len(cluster_uids)
    if cluster_size == 0:
        return 0
    count_below = sum(
        1 for uid in cluster_uids
        if GLOBAL_USER_INDEX.get(uid, 0) < user_interactions
    )
    return min(math.floor(count_below / cluster_size * 100), 99)


# ── KPI STORY 2 — PEAK MONTH ─────────────────────────────────────────

def _compute_peak_month(user_records: list[dict]) -> dict:
    """
    Story 2: Finds the calendar month with the highest total app activity.
    total_activity = sum of ALL 11 count fields for a single record.
    Earliest month wins on tie (records sorted ascending before comparison).

    Returns: peak_month (YYYY-MM-DD), peak_month_activity (int),
             peak_month_matchday_range (str)
    """
    if not user_records:
        return {
            'peak_month': '',
            'peak_month_activity': 0,
            'peak_month_matchday_range': '',
        }

    ALL_COUNT_FIELDS = [
        'article_view_count', 'story_view_count', 'video_view_count',
        'screen_view_home_count', 'screen_view_table_count',
        'screen_view_profile_count', 'screen_view_match_center_total_count',
        'screen_view_match_center_ticker_count',
        'screen_view_match_center_stats_count',
        'screen_view_match_center_lineups_count',
        'screen_view_match_center_table_count',
    ]

    def record_activity(r: dict) -> int:
        return sum(r.get(f) or 0 for f in ALL_COUNT_FIELDS)

    # Sort chronologically so earliest wins on tie
    sorted_records = sorted(user_records, key=lambda r: r.get('month', ''))
    peak_record = max(sorted_records, key=record_activity)

    peak_month = peak_record.get('month', '')
    peak_month_activity = record_activity(peak_record)

    # Derive Bundesliga season context from month number
    try:
        month_int = int(peak_month[5:7])  # YYYY-MM-DD → MM
    except (ValueError, IndexError):
        month_int = 0

    if month_int in {8, 9, 10, 11, 12}:
        matchday_range = "Matchdays 1–17 (Aug–Dec)"
    elif month_int in {1, 2, 3, 4, 5}:
        matchday_range = "Matchdays 18–34 (Jan–May)"
    elif month_int in {6, 7}:
        matchday_range = "Off-Season (Jun–Jul)"
    else:
        matchday_range = ""

    return {
        'peak_month':               peak_month,
        'peak_month_activity':      peak_month_activity,
        'peak_month_matchday_range': matchday_range,
    }


def compute_percentile(user_interactions: int,
                       all_club_records: list[dict]) -> int:
    """
    Computes the user's engagement percentile rank within their club.
    Returns 0–100 (100 = top fan in the club).

    DATA REFERENCE: one record per user per month.
    We aggregate each user's total interactions across all their months,
    then rank the selected user against all others.
    """
    # Build per-user interaction totals for the entire club
    user_groups = build_user_groups(all_club_records)
    totals = []
    for uid, records in user_groups.items():
        t = sum((r.get('article_view_count') or 0) +
                (r.get('story_view_count') or 0) +
                (r.get('video_view_count') or 0)
                for r in records)
        totals.append(t)

    if not totals:
        return 50

    below = sum(1 for t in totals if t < user_interactions)
    percentile = round(below / len(totals) * 100)
    return max(1, min(percentile, 99))  # keep between 1–99 for honesty


# ── CLUB PROFILE (random fan assignment) ─────────────────────────────

def get_club_profile(favorite_club: str,
                     data: list[dict],
                     club_index: dict = None) -> dict:
    """
    Picks ONE RANDOM real fan from the club's records,
    aggregates their individual monthly data, and computes
    their percentile rank within the club.

    Every call to this function returns a different profile —
    that's the whole point. Real fan, real numbers, real story.

    DATA REFERENCE:
    - 39 clubs in engagement data vs 18 in Clubs.xml
    - Match by exact name first, then case-insensitive, then fuzzy
    - Leverkusen in Clubs.xml = "Bayer 04 Leverkusen",
      may appear differently in engagement data
    """
    if not favorite_club:
        return {}

    # Find the club's records
    club_records = None

    if club_index:
        # Exact match
        if favorite_club in club_index:
            club_records = club_index[favorite_club]
        else:
            # Case-insensitive
            lower = favorite_club.lower()
            for key, records in club_index.items():
                if key.lower() == lower:
                    print(f"[engagement_mapper] case match '{favorite_club}' → '{key}'")
                    club_records = records
                    break

        # Fuzzy word match — use most distinctive word (>4 chars)
        if club_records is None:
            words = sorted([w for w in favorite_club.lower().split()
                            if len(w) > 4], key=len, reverse=True)
            for word in words:
                for key, records in club_index.items():
                    if word in key.lower():
                        print(f"[engagement_mapper] fuzzy '{favorite_club}' → '{key}' via '{word}'")
                        club_records = records
                        break
                if club_records is not None:
                    break

    if not club_records:
        print(f"[engagement_mapper] WARNING: no engagement data for '{favorite_club}'")
        return {}

    # Group by user_id and pick one random fan
    user_groups = build_user_groups(club_records)
    if not user_groups:
        print(f"[engagement_mapper] WARNING: no valid users for '{favorite_club}'")
        return {}

    user_ids = list(user_groups.keys())
    selected_uid = random.choice(user_ids)
    selected_records = user_groups[selected_uid]

    print(f"[engagement_mapper] selected user {selected_uid[:12]}... "
          f"({len(selected_records)} months) from {len(user_ids)} "
          f"{favorite_club} fans")

    # Aggregate the selected user's real data
    profile = aggregate_user(selected_records, uid=selected_uid, club=favorite_club)
    if not profile:
        return {}

    # Compute percentile rank within the club
    percentile = compute_percentile(
        profile['total_interactions'], club_records
    )
    profile['fan_percentile']   = percentile
    profile['engagement_score'] = percentile   # Fan Score IS the percentile
    profile['fan_count']        = len(user_ids)

    # Compute ordinal rank within the club (position 1 = top fan).
    # Ranks by total_interactions descending — honest, always available,
    # requires no external index.
    club_totals = []
    for uid_r, recs_r in user_groups.items():
        t = sum(
            (r.get('article_view_count') or 0) +
            (r.get('story_view_count') or 0) +
            (r.get('video_view_count') or 0)
            for r in recs_r
        )
        club_totals.append((uid_r, t))
    club_totals.sort(key=lambda x: x[1], reverse=True)
    club_rank_position = next(
        (i + 1 for i, (uid_r, _) in enumerate(club_totals) if uid_r == selected_uid),
        len(user_ids),  # fallback: last place
    )
    profile['club_rank_position'] = club_rank_position
    print(f"[engagement_mapper] club rank: #{club_rank_position} of {len(user_ids)}")

    return profile


# ── KPI STORY 3 + G — CONTENT DIET + COMPLETIONIST ───────────────────

def _compute_content_diet(user_records: list[dict]) -> dict:
    """
    Story 3: Classifies content consumption preference using strict dominance.
    A type must exceed the SUM of the other two to win.
    Tiebreak default (including all-zero): 'Highlight Addict'.

    Story G (Completionist): badge for users who consumed all three content types.
    content_balance_type: how evenly distributed their content consumption was.

    Returns: content_diet_type, content_total_articles, content_total_stories,
             content_total_videos, completionist (bool), content_balance_type
    """
    content_total_articles = sum(r.get('article_view_count') or 0 for r in user_records)
    content_total_stories  = sum(r.get('story_view_count') or 0 for r in user_records)
    content_total_videos   = sum(r.get('video_view_count') or 0 for r in user_records)

    # Strict dominance classification
    if content_total_articles > content_total_stories + content_total_videos:
        content_diet_type = "The Journalist"
    elif content_total_stories > content_total_articles + content_total_videos:
        content_diet_type = "The Story Chaser"
    elif content_total_videos > content_total_articles + content_total_stories:
        content_diet_type = "Highlight Addict"
    else:
        content_diet_type = "Highlight Addict"  # tiebreak default

    # Story G — Completionist
    completionist = bool(
        content_total_articles > 0 and
        content_total_stories > 0 and
        content_total_videos > 0
    )

    total_content = content_total_articles + content_total_stories + content_total_videos
    if total_content > 0:
        dominant_count = max(content_total_articles, content_total_stories, content_total_videos)
        dominant_ratio = dominant_count / total_content
        if dominant_ratio < 0.5:
            content_balance_type = "Omnivore"
        elif dominant_ratio < 0.7:
            content_balance_type = "Leaning Fan"
        else:
            content_balance_type = "Specialist"
    else:
        content_balance_type = "Specialist"

    return {
        'content_diet_type':       content_diet_type,
        'content_total_articles':  content_total_articles,
        'content_total_stories':   content_total_stories,
        'content_total_videos':    content_total_videos,
        'completionist':           completionist,
        'content_balance_type':    content_balance_type,
    }


# ── KPI STORIES B + C + H — SCREEN VIEW SIGNALS ──────────────────────

def _compute_screen_view_signals(user_records: list[dict]) -> dict:
    """
    Stories B, C, H: Derives fan behaviour signals from screen view counts.

    Story B (League Table Devotee): how obsessed with the standings?
    Story C (Fixture Planner): planning-oriented vs in-the-moment fan?
    Story H (Profile Analyst): squad-focused vs match-only fan?

    Returns: total_table_views, total_home_views, total_profile_views,
             table_persona, home_ratio (float), planning_style, squad_interest
    """
    total_table_views   = sum(r.get('screen_view_table_count') or 0 for r in user_records)
    total_home_views    = sum(r.get('screen_view_home_count') or 0 for r in user_records)
    total_profile_views = sum(r.get('screen_view_profile_count') or 0 for r in user_records)
    total_mc_views      = sum(r.get('screen_view_match_center_total_count') or 0 for r in user_records)
    total_video_views   = sum(r.get('video_view_count') or 0 for r in user_records)
    local_lineups       = sum(r.get('screen_view_match_center_lineups_count') or 0 for r in user_records)

    # Story B — Table persona
    if total_table_views > 20:
        table_persona = "Points Tracker"
    elif total_table_views > 5:
        table_persona = "League Aware"
    else:
        table_persona = "Trust the Process"

    # Story C — Planning style (home screen ratio)
    nav_denominator = total_home_views + total_mc_views + total_video_views
    home_ratio = total_home_views / nav_denominator if nav_denominator > 0 else 0.0
    if home_ratio > 0.5:
        planning_style = "The Planner"
    elif home_ratio > 0.3:
        planning_style = "Pre-Match Ritualist"
    else:
        planning_style = "In-the-Moment Fan"

    # Story H — Squad interest
    if local_lineups > 10 and total_profile_views > 10:
        squad_interest = "Squad Watcher"
    elif total_profile_views > 10:
        squad_interest = "Club Historian"
    elif total_profile_views <= 2:
        squad_interest = "Pure Match Fan"
    else:
        squad_interest = "Balanced Fan"

    return {
        'total_table_views':   total_table_views,
        'total_home_views':    total_home_views,
        'total_profile_views': total_profile_views,
        'table_persona':       table_persona,
        'home_ratio':          home_ratio,
        'planning_style':      planning_style,
        'squad_interest':      squad_interest,
    }


# ── KPI STORY D — STREAK HUNTER ──────────────────────────────────────

_MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun',
               'Jul','Aug','Sep','Oct','Nov','Dec']


def _compute_streak(user_records: list[dict]) -> dict:
    """
    Story D: Finds the longest consecutive months streak with app activity.
    Consecutive = two months that are exactly 1 calendar month apart.
    Handles December → January year rollover.

    streak_context ties the streak to Bundesliga season narrative:
    - Months overlapping {11,12,1,2} → 'Title Race Tension'
    - Months overlapping {3,4,5}     → 'Spring Charge'
    - Months overlapping {8,9,10}    → 'Season Opener'
    - Otherwise                      → 'Dedicated Run'

    Returns: max_streak (int), streak_period (str), streak_context (str)
    """
    if not user_records:
        return {'max_streak': 0, 'streak_period': '', 'streak_context': ''}

    ALL_COUNT_FIELDS = [
        'article_view_count', 'story_view_count', 'video_view_count',
        'screen_view_home_count', 'screen_view_table_count',
        'screen_view_profile_count', 'screen_view_match_center_total_count',
        'screen_view_match_center_ticker_count',
        'screen_view_match_center_stats_count',
        'screen_view_match_center_lineups_count',
        'screen_view_match_center_table_count',
    ]

    def record_activity(r: dict) -> int:
        return sum(r.get(f) or 0 for f in ALL_COUNT_FIELDS)

    # Filter to active records and parse months
    active = []
    for r in user_records:
        if record_activity(r) > 0:
            m = r.get('month', '')
            try:
                y, mo = int(m[:4]), int(m[5:7])
                active.append((y, mo))
            except (ValueError, IndexError):
                continue

    if not active:
        return {'max_streak': 0, 'streak_period': '', 'streak_context': ''}

    # Sort chronologically and deduplicate
    active = sorted(set(active))

    # Find longest consecutive run
    best_start, best_len = 0, 1
    cur_start, cur_len = 0, 1

    for i in range(1, len(active)):
        y1, m1 = active[i-1]
        y2, m2 = active[i]
        # Check consecutive: next month
        if (m1 == 12 and y2 == y1 + 1 and m2 == 1) or (m2 == m1 + 1 and y2 == y1):
            cur_len += 1
            if cur_len > best_len:
                best_len = cur_len
                best_start = cur_start
        else:
            cur_start = i
            cur_len = 1

    max_streak = best_len

    # Build period string
    best_months = active[best_start: best_start + best_len]
    if best_len == 1:
        streak_period = _MONTH_ABBR[best_months[0][1] - 1]
    else:
        streak_period = f"{_MONTH_ABBR[best_months[0][1]-1]}–{_MONTH_ABBR[best_months[-1][1]-1]}"

    # Context
    month_ints = {m for _, m in best_months}
    if month_ints & {11, 12, 1, 2}:
        streak_context = "Title Race Tension"
    elif month_ints & {3, 4, 5}:
        streak_context = "Spring Charge"
    elif month_ints & {8, 9, 10}:
        streak_context = "Season Opener"
    else:
        streak_context = "Dedicated Run"

    return {
        'max_streak':    max_streak,
        'streak_period': streak_period,
        'streak_context': streak_context,
    }


# ── KPI STORY E — INTERNATIONAL VOICE ────────────────────────────────

def _compute_locale_identity(user_records: list[dict]) -> dict:
    """
    Story E: Identifies the user's language community size and locale classification.
    language_community_size: how many distinct users share the same language+country combo.
    is_rare_locale: True if community_size > 0 and < 10 (truly niche fan).
    locale_class: one of 'Heimfan', 'Expat Fan', 'Global Bundesliga', 'Rare Supporter'.

    Returns: language_community_size (int), is_rare_locale (bool), locale_class (str)
    """
    if not user_records:
        return {
            'language_community_size': 0,
            'is_rare_locale':          False,
            'locale_class':            'Global Bundesliga',
        }

    base = user_records[0]
    language = (base.get('language') or '').strip().lower()
    country  = (base.get('country') or '').strip()

    language_community_size = LANGUAGE_COUNTRY_INDEX.get((language, country), 0)
    is_rare_locale = bool(0 < language_community_size < 10)

    # Base locale class
    if language == 'de' and country.upper() == 'DE':
        locale_class = 'Heimfan'
    elif language != 'de' and country.upper() == 'DE':
        locale_class = 'Expat Fan'
    else:
        locale_class = 'Global Bundesliga'

    # Rare Supporter override (not applied to Heimfan — de+DE is never rare in practice)
    if is_rare_locale and locale_class != 'Heimfan':
        locale_class = 'Rare Supporter'

    return {
        'language_community_size': language_community_size,
        'is_rare_locale':          is_rare_locale,
        'locale_class':            locale_class,
    }


# ── KPI STORY 6 — GLOBAL FAN POSITION ────────────────────────────────

def _compute_global_rank(uid: str, user_interactions: int) -> dict:
    """
    Story 6: Computes percentile rank + ordinal position across all 2,765 users.
    global_rank: floor(count_below / total_users * 100) clamped to [0, 99].
    global_rank_position: 1-based rank by descending total_interactions (stable sort).

    Returns: global_rank (int 0–99), global_rank_position (int)
    """
    all_uids = list(GLOBAL_USER_INDEX.keys())
    global_rank = _percentile_rank(user_interactions, all_uids)

    # 1-based ordinal rank — stable sort preserves insertion order for ties
    sorted_items = sorted(GLOBAL_USER_INDEX.items(), key=lambda x: x[1], reverse=True)
    global_rank_position = len(GLOBAL_USER_INDEX)  # fallback if uid not found
    for i, (u, _) in enumerate(sorted_items):
        if u == uid:
            global_rank_position = i + 1
            break

    return {
        'global_rank':          global_rank,
        'global_rank_position': global_rank_position,
    }


# ── KPI STORY 7 — VIDEO MOMENT ────────────────────────────────────────

def _compute_video_moment(user_records: list[dict], club: str) -> dict:
    """
    Story 7: Finds the video title most associated with this fan's season.
    Bayern fans: tries personal title first (S3 match), then community fallback.
    Non-Bayern fans: uses their own title from peak video month (no S3 URL).
    is_played_clip: True ONLY for Bayern fans with a matching S3 keyword.

    Returns: video_title (str or None), is_played_clip (bool)
    """
    if not user_records:
        return {'video_title': None, 'is_played_clip': False}

    # Find the record with highest video_view_count (first on tie)
    video_peak_record = max(
        user_records,
        key=lambda r: r.get('video_view_count') or 0
    )

    # Determine if this is a Bayern fan
    club_lower = club.lower() if club else ''
    is_bayern = (club_lower in BAYERN_CLUB_NAMES_SET or 'bayern' in club_lower)

    if is_bayern:
        # Try personal title from peak record
        title = (video_peak_record.get('favorite_video_title') or '').strip()
        if title:
            title_lower = title.lower()
            if any(kw in title_lower for kw in BAYERN_VIDEO_KEYWORDS):
                return {'video_title': title, 'is_played_clip': True}

        # Community fallback — most common Bayern title (cached)
        if 'title' not in _BAYERN_COMMUNITY_VIDEO_CACHE:
            # Gather all Bayern records from CLUB_INDEX
            bayern_records = []
            for key, recs in CLUB_INDEX.items():
                if key.lower() in BAYERN_CLUB_NAMES_SET or 'bayern' in key.lower():
                    bayern_records.extend(recs)
            titles = [
                r.get('favorite_video_title', '')
                for r in bayern_records
                if r.get('favorite_video_title', '').strip()
            ]
            community_title = max(set(titles), key=titles.count) if titles else None
            _BAYERN_COMMUNITY_VIDEO_CACHE['title'] = community_title

        community_title = _BAYERN_COMMUNITY_VIDEO_CACHE.get('title')
        if community_title:
            ct_lower = community_title.lower()
            is_played = any(kw in ct_lower for kw in BAYERN_VIDEO_KEYWORDS)
            return {'video_title': community_title, 'is_played_clip': is_played}

        return {'video_title': None, 'is_played_clip': False}

    else:
        # Non-Bayern: find best title from user's own records
        # Prefer title from video peak record; else most recent record with a title
        peak_title = (video_peak_record.get('favorite_video_title') or '').strip()
        if peak_title:
            return {'video_title': peak_title, 'is_played_clip': False}

        # Fall back to most recent record with a title
        sorted_records = sorted(user_records, key=lambda r: r.get('month', ''), reverse=True)
        for r in sorted_records:
            t = (r.get('favorite_video_title') or '').strip()
            if t:
                return {'video_title': t, 'is_played_clip': False}

        return {'video_title': None, 'is_played_clip': False}


# ── KPI STORY 4 — COUNTRY CLUSTER RANK ───────────────────────────────

def _compute_country_rank(uid: str, club: str, country: str,
                          global_rank: int) -> dict:
    """
    Story 4: Percentile rank within club × country cluster.
    Null/empty country falls back to global_rank and cluster_size=all users.
    country comparison is case-insensitive (normalised to lowercase for key lookup).

    Returns: country_rank (int 0–99), country_cluster_size (int),
             country (str), is_international (bool)
    """
    country_clean = (country or '').strip()

    if not country_clean:
        # Null fallback
        return {
            'country_rank':         global_rank,
            'country_cluster_size': len(GLOBAL_USER_INDEX),
            'country':              '',
            'is_international':     False,
        }

    country_lower = country_clean.lower()
    cluster_key = (club, country_lower)
    cluster_uids = CLUB_COUNTRY_INDEX.get(cluster_key, [uid])  # fallback: just this user

    country_rank = _percentile_rank(GLOBAL_USER_INDEX.get(uid, 0), cluster_uids)
    is_international = (country_clean.upper() != 'DE')

    return {
        'country_rank':         country_rank,
        'country_cluster_size': len(cluster_uids),
        'country':              country_clean,
        'is_international':     is_international,
    }

# ── KPI STORY 5 — AGE COHORT RANK ────────────────────────────────────

def _compute_age_rank(uid: str, club: str, age_group: str,
                      global_rank: int) -> dict:
    """
    Story 5: Percentile rank within club × age_group cluster.
    Null/empty age_group falls back to global_rank and cluster_size=all users.
    age_group matching is exact string match (already normalised at load time).

    Returns: age_rank (int 0–99), age_cluster_size (int), age_group (str)
    """
    age_group_clean = (age_group or '').strip()

    if not age_group_clean:
        # Null fallback
        return {
            'age_rank':         global_rank,
            'age_cluster_size': len(GLOBAL_USER_INDEX),
            'age_group':        'Unknown',
        }

    cluster_uids = CLUB_AGE_INDEX.get((club, age_group_clean), [uid])  # fallback: just this user
    age_rank = _percentile_rank(GLOBAL_USER_INDEX.get(uid, 0), cluster_uids)

    return {
        'age_rank':         age_rank,
        'age_cluster_size': len(cluster_uids),
        'age_group':        age_group_clean,
    }

# ── KPI STORY F — SUPERMATCH MONTH ────────────────────────────────────

# Bundesliga 2024/25 key moments calendar — YYYY-MM prefix → narrative context
SEASON_HIGHLIGHTS = {
    "2024-08": "Season opener — matchday 1 energy",
    "2024-09": "European nights begin",
    "2024-10": "October crunch — title picture forming",
    "2024-11": "International break + Pokal round",
    "2024-12": "Winter break approaches — first half verdict",
    "2025-01": "Winter return — second half kickoff",
    "2025-02": "Spring chase begins",
    "2025-03": "Title race intensifying",
    "2025-04": "Title race at peak — every point counts",
    "2025-05": "Final matchday — Bayern Meister",
}


def _compute_supermatch_month(user_records: list[dict], peak_month: str) -> dict:
    """
    Story F: Finds the 'supermatch month' — the month where the user was
    most engaged across ALL dimensions simultaneously, not just Match Center.

    composite = mc*0.3 + articles*0.2 + stories*0.2 + videos*0.2 + home*0.1
    Earliest record wins on tie.

    supermatch_context: maps the month to a real Bundesliga season narrative.
    is_same_as_peak: True when supermatch_month == peak_month (from Story 2).

    Returns: supermatch_month (YYYY-MM-DD), supermatch_context (str),
             is_same_as_peak (bool)
    """
    if not user_records:
        return {
            'supermatch_month':   '',
            'supermatch_context': '',
            'is_same_as_peak':    False,
        }

    def composite_score(r: dict) -> float:
        mc      = r.get('screen_view_match_center_total_count') or 0
        art     = r.get('article_view_count') or 0
        stories = r.get('story_view_count') or 0
        videos  = r.get('video_view_count') or 0
        home    = r.get('screen_view_home_count') or 0
        return mc * 0.3 + art * 0.2 + stories * 0.2 + videos * 0.2 + home * 0.1

    # Sort chronologically so earliest wins on tie (Python's max is stable on equal keys)
    sorted_records = sorted(user_records, key=lambda r: r.get('month', ''))
    best_record = max(sorted_records, key=composite_score)

    supermatch_month = best_record.get('month', '')
    month_prefix = supermatch_month[:7] if supermatch_month else ''
    supermatch_context = SEASON_HIGHLIGHTS.get(month_prefix, "A defining month")
    is_same_as_peak = (supermatch_month == peak_month)

    return {
        'supermatch_month':   supermatch_month,
        'supermatch_context': supermatch_context,
        'is_same_as_peak':    is_same_as_peak,
    }
