# backend/lambda_handler.py
"""
AWS Lambda entry point.
Receives POST requests from API Gateway.
Routes to handler functions and returns JSON responses.

Design: No user_id lookup. The engagement dataset has no mechanism to
identify demo users. All requests go through the club cohort path —
which is the correct and honest use of the data. The cohort profile
reflects the real aggregate behaviour of that club's fan community in
the Bundesliga app (26,242 records, 2,765 unique users, Jan–Dec 2025).
"""

import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

import boto3
from xml_parser import load_all_static_data, parse_match, get_bench_players
from stats_processor import get_ranked_players, get_top_n
from engagement_mapper import (
    load_engagement_data, build_club_index, get_club_profile,
)
from bedrock_handler import run_full_pipeline
from config import CLUB_IDS, STATS_AVAILABLE_CLUBS, TACTICAL_STYLES, S3_BUCKET, S3_REGION

# Separate S3 client for presigned URLs (read-only)
s3_client = boto3.client('s3', region_name=S3_REGION)

# ── COLD START CACHE ─────────────────────────────────────────────────
print("[lambda] cold start — loading static data...")
start_time = time.time()

t0 = time.time()
STATIC_DATA    = load_all_static_data()      # clubs + players + schedule
print(f"[lambda] STATIC_DATA loaded in {time.time() - t0:.2f}s")

t0 = time.time()
ENGAGEMENT     = load_engagement_data()      # 26,242 records (strings normalised)
print(f"[lambda] ENGAGEMENT loaded in {time.time() - t0:.2f}s")

t0 = time.time()
CLUB_INDEX     = build_club_index(ENGAGEMENT)  # {club_name: [records]}
print(f"[lambda] CLUB_INDEX built in {time.time() - t0:.2f}s — "
      f"{len(CLUB_INDEX)} clubs indexed")

from engagement_mapper import GLOBAL_USER_INDEX, CLUB_COUNTRY_INDEX, CLUB_AGE_INDEX, LANGUAGE_COUNTRY_INDEX
print(f"[lambda] GLOBAL_USER_INDEX: {len(GLOBAL_USER_INDEX)} users")
print(f"[lambda] CLUB_COUNTRY_INDEX: {len(CLUB_COUNTRY_INDEX)} clusters")
print(f"[lambda] CLUB_AGE_INDEX: {len(CLUB_AGE_INDEX)} clusters")
print(f"[lambda] LANGUAGE_COUNTRY_INDEX: {len(LANGUAGE_COUNTRY_INDEX)} locale combos")

t0 = time.time()
RANKED_PLAYERS = get_ranked_players()        # 34 Bayern players, Z-scored
print(f"[lambda] RANKED_PLAYERS computed in {time.time() - t0:.2f}s")

print(f"[lambda] cold start complete in {time.time() - start_time:.2f}s")


# ── CORS / RESPONSE HELPERS ──────────────────────────────────────────
CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
}


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def _error(status: int, message: str) -> dict:
    return _response(status, {"error": message})


# ── ROUTE HANDLERS ───────────────────────────────────────────────────

def handle_wrapped(body: dict) -> dict:
    """
    POST /wrapped
    Required: favorite_club (string — club long name from Clubs.xml)
    Optional: user_name, tactical_style

    Flow:
    1. Look up real cohort profile from engagement data for the club
    2. Inject user_name and tactical_style for personalisation
    3. Run 3-stage Bedrock pipeline → narrative card
    4. Generate presigned URL for matching video clip
    """
    favorite_club  = (body.get('favorite_club') or '').strip()
    tactical_style = (body.get('tactical_style') or 'High Press').strip()
    user_name      = (body.get('user_name') or 'Manager').strip()

    if not favorite_club:
        return _error(400, "favorite_club is required")

    if tactical_style not in TACTICAL_STYLES:
        print(f"[lambda] WARNING: unknown tactical_style '{tactical_style}', using default")
        tactical_style = 'High Press'

    # Get real cohort profile from engagement data
    profile = get_club_profile(favorite_club, ENGAGEMENT, CLUB_INDEX)

    if not profile:
        return _error(404, f"No engagement data found for club: {favorite_club}")

    # Inject the personal context the user provided
    profile['user_name']      = user_name
    profile['favorite_club']  = favorite_club
    profile['tactical_style'] = tactical_style

    # Generate presigned URL for matching video clip (Bayern only — DATA REFERENCE)
    video_url = _get_video_url(profile.get('favorite_video', ''), favorite_club)
    profile['video_url'] = video_url

    # Run 3-stage Bedrock pipeline
    result = run_full_pipeline(RANKED_PLAYERS[:3], profile, tactical_style)

    return _response(200, {
        "user_name":      user_name,
        "favorite_club":  favorite_club,
        "tactical_style": tactical_style,
        "profile":        profile,
        "mvp_analysis":   result['mvp_analysis'],
        "scout_report":   result['scout_report'],
        "wrapped_card":   result['wrapped_card'],
    })


# Video filename map — keywords from engagement favorite_video_title → S3 key
# DATA REFERENCE: ALL video clips in S3 are Bayern München content only.
# No clips exist for other clubs. Video section is Bayern-only.
# Leverkusen/Dortmund/etc → no video URL returned → frontend shows text only.

BAYERN_CLUB_NAMES = {
    'FC Bayern München', 'FC Bayern Munich', 'Bayern München',
    'Bayern Munich', 'FCB', 'fc bayern münchen', 'fc bayern munich',
}

VIDEO_PREFIX = "Challenge 1 \u2013 Build Bundesliga Wrapped/data/260210 Hackathon 2026 Recherche/"

# Keyword → S3 filename. Keywords matched against favorite_video_title (lowercase).
# DATA REFERENCE: all clips are 9:16 vertical, Bayern 2024-25 season.
VIDEO_MAP = [
    ("kane",       "Goal Clips/2425_MDC_MD19_KaneGoalSMMF_916_ENG_01.mp4"),
    ("musiala",    "Goal Clips/9x16_GoalMusiala_VJ_DIR_HED_250224_MDF_4486194.mp4"),
    ("jamal",      "Goal Clips/9x16_JamalMusialaGoalSMMF_VJ_DIR_GOL_241223_MDF_4373229.mp4"),
    ("davies",     "Goal Clips/9x16_DaviesGoalMD15_VJ_DIR_GOL_241223_03_MDF_4372981.mp4"),
    ("müller",     "Other Single Clips/2425_MDC_MD34_MuellerLastGame_916_ENG_01.mp4"),
    ("muller",     "Other Single Clips/2425_MDC_MD34_MuellerLastGame_916_ENG_01.mp4"),
    ("meister",    "Other Single Clips/2425_MDC_MD34_BayernMeisterfeier_916_ENG.mp4"),
    ("champion",   "Other Single Clips/2425_MDC_MD34_BayernMeisterfeier_916_ENG.mp4"),
    ("bier",       "Other Single Clips/9x16_BayernBierdusche_VJ_DIR_HED_250512_MDF_4644774.mp4"),
    ("beer",       "Other Single Clips/9x16_MuellerBeerShower_VJ_LEH_250519_4659612.mp4"),
    ("hat-trick",  "Goal Clips/9x16_Kane Hat-Trick MDC_VJ_DIR_FU?R_241021_4246883.mp4"),
    # Default: short Kane clip (12MB, fast to load)
    ("",           "Goal Clips/9x16_MDC_Kane_VJ_DIR_FIS_251124_4311639.mp4"),
]


def _get_video_url(favorite_video_title: str, favorite_club: str) -> str | None:
    """
    Returns a presigned S3 URL ONLY for Bayern München fans.

    DATA REFERENCE: All S3 video clips are Bayern content only.
    Other clubs have no clips — returning a Bayern clip for a Leverkusen
    fan is data-incoherent and misleading. Return None for non-Bayern clubs.
    Frontend handles None gracefully (shows text title instead of video).
    """
    # Only Bayern gets a video
    club_lower = (favorite_club or '').lower()
    is_bayern = any(name.lower() in club_lower or club_lower in name.lower()
                    for name in BAYERN_CLUB_NAMES)
    if not is_bayern:
        print(f"[lambda] no video for non-Bayern club: {favorite_club}")
        return None

    try:
        title_lower = (favorite_video_title or '').lower()
        selected_key = VIDEO_MAP[-1][1]  # default
        for keyword, key in VIDEO_MAP[:-1]:
            if keyword and keyword in title_lower:
                selected_key = key
                break

        full_key = VIDEO_PREFIX + selected_key
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': full_key},
            ExpiresIn=3600,
        )
        print(f"[lambda] video URL generated: {selected_key}")
        return url
    except Exception as e:
        print(f"[lambda] WARNING: could not generate video URL: {e}")
        return None


def handle_clubs(body: dict) -> dict:
    """
    POST /clubs
    Returns all 18 clubs from Clubs.xml with IDs and hex colors.
    """
    clubs = STATIC_DATA['clubs']
    club_list = [
        {
            "club_id":           cid,
            "name":              info['name'],
            "short_name":        info['short_name'],
            "three_letter_code": info['three_letter_code'],
            "primary_color":     info['primary_color'],
            "secondary_color":   info['secondary_color'],
        }
        for cid, info in clubs.items()
    ]
    club_list.sort(key=lambda x: x['name'])
    return _response(200, {"clubs": club_list})


def handle_mvp(body: dict) -> dict:
    """
    POST /mvp
    Returns top 3 Bayern players by Impact Score (Z-score, 166 dimensions).
    """
    top3 = RANKED_PLAYERS[:3]
    players_out = []
    for p in top3:
        players_out.append({
            "name":                f"{p['first_name']} {p['last_name']}",
            "impact_score":        p['impact_score'],
            "goal_participations": int(p['participations_goal']),
            "xg":                  round(p['xg'], 2),
            "xg_efficiency":       round(p['xg_efficiency'], 2),
            "distance_per90_km":   round(p['dist_per90'] / 1000, 2),
            "max_speed_kmh":       round(p['maximum_speed'], 1),
        })
    return _response(200, {
        "club":    "FC Bayern München",
        "note":    "Top 3 by Impact Score — Z-score across 166 statistical dimensions",
        "players": players_out,
    })


def handle_substitution(body: dict) -> dict:
    """
    POST /substitution
    Required: match_id, team_id
    Returns starting XI and bench players from real match XML.
    """
    match_id = (body.get('match_id') or '').strip()
    team_id  = (body.get('team_id') or '').strip()

    if not match_id or not team_id:
        return _error(400, "match_id and team_id are required")

    match = parse_match(match_id)
    if not match:
        return _error(404, f"Match {match_id} not found")

    players = STATIC_DATA['players']
    is_home = match['home_team_id'] == team_id
    lineup  = match['home_lineup'] if is_home else match['guest_lineup']

    def enrich(p):
        info = players.get(p['person_id'], {})
        return {
            "person_id":        p['person_id'],
            "name":             f"{info.get('first_name','')} {info.get('last_name','')}".strip(),
            "shirt_number":     p['shirt_number'],
            "playing_position": p['playing_position'],
            "starting":         p['starting'],
            "has_season_stats": p['person_id'] in {pl['player_id'] for pl in RANKED_PLAYERS},
        }

    starters = [enrich(p) for p in lineup if p['starting']]
    bench    = [enrich(p) for p in lineup if not p['starting']]

    return _response(200, {
        "match_id":      match_id,
        "team_id":       team_id,
        "match_day":     match['match_day'],
        "result":        match['result'],
        "formation":     match['formation_home'] if is_home else match['formation_guest'],
        "starting_xi":   starters,
        "bench":         bench,
    })


def handle_analyze_sub(body: dict) -> dict:
    """
    POST /analyze-sub
    Required: match_id, team_id, starter_person_id, bench_person_id
    Returns Bedrock tactical analysis of the proposed substitution.
    """
    match_id   = (body.get('match_id') or '').strip()
    team_id    = (body.get('team_id') or '').strip()
    starter_id = (body.get('starter_person_id') or '').strip()
    bench_id   = (body.get('bench_person_id') or '').strip()

    if not all([match_id, team_id, starter_id, bench_id]):
        return _error(400, "match_id, team_id, starter_person_id, bench_person_id all required")

    match = parse_match(match_id)
    if not match:
        return _error(404, f"Match {match_id} not found")

    players  = STATIC_DATA['players']
    clubs    = STATIC_DATA['clubs']
    is_home  = match['home_team_id'] == team_id
    lineup   = match['home_lineup'] if is_home else match['guest_lineup']

    opponent_id = match['guest_team_id'] if is_home else match['home_team_id']
    opponent    = clubs.get(opponent_id, {}).get('short_name', 'Unknown')
    formation   = match['formation_home'] if is_home else match['formation_guest']

    starter_entry = next((p for p in lineup if p['person_id'] == starter_id and p['starting']), None)
    bench_entry   = next((p for p in lineup if p['person_id'] == bench_id   and not p['starting']), None)

    if not starter_entry:
        return _error(404, f"Starter {starter_id} not found in match lineup")
    if not bench_entry:
        return _error(404, f"Bench player {bench_id} not found in match lineup")

    def player_name(pid):
        info = players.get(pid, {})
        return f"{info.get('first_name','')} {info.get('last_name','')}".strip()

    starter_player = {
        'name':             player_name(starter_id),
        'playing_position': starter_entry.get('playing_position', ''),
    }
    bench_player = {
        'name':             player_name(bench_id),
        'playing_position': bench_entry.get('playing_position', ''),
    }

    ranked = {p['player_id']: p for p in RANKED_PLAYERS}
    starter_stats = ranked.get(starter_id, {})
    bench_stats   = ranked.get(bench_id, {})
    has_deep_stats = bool(starter_stats and bench_stats)

    match_context = {
        'match_day': match['match_day'],
        'opponent':  opponent,
        'result':    match['result'],
        'formation': formation,
    }

    from bedrock_handler import analyze_substitution
    analysis = analyze_substitution(
        match_context, starter_player, bench_player,
        starter_stats, bench_stats,
    )

    def safe_stats(s):
        if not s:
            return {}
        return {
            'impact_score':        s.get('impact_score', 0),
            'xg':                  round(s.get('xg', 0), 2),
            'participations_goal': s.get('participations_goal', 0),
            'dist_per90_km':       round(s.get('dist_per90', 0) / 1000, 2),
        }

    return _response(200, {
        'match_id':        match_id,
        'match_day':       match['match_day'],
        'opponent':        opponent,
        'result':          match['result'],
        'starter':         starter_player,
        'bench_player':    bench_player,
        'has_deep_stats':  has_deep_stats,
        'starter_stats':   safe_stats(starter_stats),
        'bench_stats':     safe_stats(bench_stats),
        'analysis':        analysis,
    })


# ── MAIN HANDLER ─────────────────────────────────────────────────────

def lambda_handler(event, context):
    """API Gateway proxy integration entry point."""

    if event.get('httpMethod') == 'OPTIONS':
        return _response(200, {})

    path   = event.get('path', '/wrapped').rstrip('/')
    method = event.get('httpMethod', 'POST')

    if method != 'POST':
        return _error(405, "POST only")

    try:
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")

    print(f"[lambda] {method} {path} — body keys: {list(body.keys())}")

    routes = {
        '/wrapped':      handle_wrapped,
        '/clubs':        handle_clubs,
        '/mvp':          handle_mvp,
        '/substitution': handle_substitution,
        '/analyze-sub':  handle_analyze_sub,
    }

    handler_fn = routes.get(path)
    if not handler_fn:
        return _error(404, f"Unknown path: {path}")

    try:
        return handler_fn(body)
    except Exception as e:
        print(f"[lambda] ERROR on {path}: {e}")
        import traceback
        traceback.print_exc()
        return _error(500, f"Internal error: {str(e)}")
