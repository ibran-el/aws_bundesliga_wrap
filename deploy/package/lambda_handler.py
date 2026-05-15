# backend/lambda_handler.py
"""
AWS Lambda entry point.
Receives POST requests from API Gateway.
Runs full pipeline and returns Wrapped JSON.
"""

import json
import os
import sys

# Ensure backend modules are importable inside Lambda
sys.path.insert(0, os.path.dirname(__file__))

from xml_parser import load_all_static_data, parse_match, get_bench_players
from stats_processor import get_ranked_players, get_top_n
from engagement_mapper import (
    load_engagement_data, build_user_index,
    get_user_profile, get_club_cohort_profile
)
from bedrock_handler import run_full_pipeline
from config import CLUB_IDS, STATS_AVAILABLE_CLUBS, TACTICAL_STYLES

# ── COLD START CACHE ─────────────────────────────────────────────────
# These run ONCE per Lambda container lifecycle
print("[lambda] cold start — loading static data...")
STATIC_DATA   = load_all_static_data()          # clubs + players + schedule
ENGAGEMENT    = load_engagement_data()           # 26,242 records
USER_INDEX    = build_user_index(ENGAGEMENT)     # {user_id: [records]}
RANKED_PLAYERS = get_ranked_players()            # 34 Bayern players, scored
print("[lambda] cold start complete.")


# ── CORS HEADERS ─────────────────────────────────────────────────────
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
        "body": json.dumps(body, ensure_ascii=False)
    }


def _error(status: int, message: str) -> dict:
    return _response(status, {"error": message})


# ── ROUTE HANDLERS ───────────────────────────────────────────────────

def handle_wrapped(body: dict) -> dict:
    """
    POST /wrapped
    Required: favorite_club (string)
    Optional: user_id, tactical_style, user_name
    Returns: full Wrapped card + MVP + scout report
    """
    favorite_club  = body.get('favorite_club', '')
    user_id        = body.get('user_id', '')
    tactical_style = body.get('tactical_style', 'High Press')
    user_name      = body.get('user_name', 'Manager')

    if not favorite_club:
        return _error(400, "favorite_club is required")

    if tactical_style not in TACTICAL_STYLES:
        tactical_style = 'High Press'

    # Get user profile — individual if user_id provided, else cohort
    if user_id:
        profile = get_user_profile(user_id, USER_INDEX)
        if not profile:
            # user_id not found — fall back to cohort
            profile = get_club_cohort_profile(favorite_club, ENGAGEMENT)
            profile['is_cohort'] = True
    else:
        profile = get_club_cohort_profile(favorite_club, ENGAGEMENT)
        if not profile:
            # Fuzzy fallback — try partial match
            favorite_club_lower = favorite_club.lower()
            for record_club in set(r.get('favorite_club','') for r in ENGAGEMENT if r.get('favorite_club')):
                if any(word in record_club.lower() for word in favorite_club_lower.split() if len(word) > 3):
                    profile = get_club_cohort_profile(record_club, ENGAGEMENT)
                    if profile:
                        print(f"[lambda] fuzzy matched '{favorite_club}' → '{record_club}'")
                        break
        if profile:
            profile['is_cohort'] = True

    if not profile:
        return _error(404, f"No data found for club: {favorite_club}")

    # Inject user name for personalization
    profile['user_name'] = user_name

    # Run Bedrock pipeline
    result = run_full_pipeline(RANKED_PLAYERS[:3], profile, tactical_style)

    return _response(200, {
        "user_name":     user_name,
        "favorite_club": favorite_club,
        "tactical_style": tactical_style,
        "profile":       profile,
        "mvp_analysis":  result['mvp_analysis'],
        "scout_report":  result['scout_report'],
        "wrapped_card":  result['wrapped_card'],
    })


def handle_clubs(body: dict) -> dict:
    """
    POST /clubs
    Returns list of all 18 clubs with IDs and colors.
    Used by frontend club selector.
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
    # Sort alphabetically
    club_list.sort(key=lambda x: x['name'])
    return _response(200, {"clubs": club_list})


def handle_mvp(body: dict) -> dict:
    """
    POST /mvp
    Returns top 3 Bayern players by Impact Score.
    Used by frontend MVP selector card.
    """
    top3 = RANKED_PLAYERS[:3]
    players_out = []
    for p in top3:
        players_out.append({
            "name":              f"{p['first_name']} {p['last_name']}",
            "impact_score":      p['impact_score'],
            "goal_participations": int(p['participations_goal']),
            "xg":                round(p['xg'], 2),
            "xg_efficiency":     round(p['xg_efficiency'], 2),
            "distance_per90_km": round(p['dist_per90'] / 1000, 2),
            "max_speed_kmh":     round(p['maximum_speed'], 1),
            "season_label":      "",   # filled by Bedrock on /wrapped call
        })
    return _response(200, {
        "club": "FC Bayern München",
        "note": "Season MVP — 34-matchday cumulative profile",
        "players": players_out
    })


def handle_substitution(body: dict) -> dict:
    """
    POST /substitution
    Required: match_id, team_id, out_player_id, in_player_id
    Returns: bench options or substitution context for Bedrock
    Note: Rich stats available for Bayern only.
    """
    match_id      = body.get('match_id', '')
    team_id       = body.get('team_id', '')
    out_player_id = body.get('out_player_id', '')

    if not match_id or not team_id:
        return _error(400, "match_id and team_id are required")

    match = parse_match(match_id)
    if not match:
        return _error(404, f"Match {match_id} not found")

    bench = get_bench_players(match, team_id)
    players = STATIC_DATA['players']

    # Enrich bench with player names
    bench_enriched = []
    for b in bench:
        pid = b['person_id']
        info = players.get(pid, {})
        bench_enriched.append({
            "person_id":       pid,
            "name":            f"{info.get('first_name','')} {info.get('last_name','')}".strip(),
            "shirt_number":    b['shirt_number'],
            "playing_position": b['playing_position'],
            "has_season_stats": pid in {p['player_id']
                                        for p in RANKED_PLAYERS},
        })

    return _response(200, {
        "match_id":   match_id,
        "team_id":    team_id,
        "result":     match['result'],
        "formation":  match['formation_home'] if match['home_team_id'] == team_id
                      else match['formation_guest'],
        "bench":      bench_enriched,
    })


# ── MAIN HANDLER ─────────────────────────────────────────────────────

def lambda_handler(event, context):
    """
    API Gateway proxy integration entry point.
    Routes by path parameter.
    """
    # Handle CORS preflight
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