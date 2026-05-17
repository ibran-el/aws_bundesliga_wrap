# backend/lambda_handler.py
"""
AWS Lambda entry point.
Receives POST requests from API Gateway.
Runs full pipeline and returns Wrapped JSON.
"""

import json
import os
import sys
import time

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
start_time = time.time()

t0 = time.time()
STATIC_DATA   = load_all_static_data()          # clubs + players + schedule
print(f"[lambda] STATIC_DATA loaded in {time.time() - t0:.2f}s")

t0 = time.time()
ENGAGEMENT    = load_engagement_data()           # 26,242 records
print(f"[lambda] ENGAGEMENT loaded in {time.time() - t0:.2f}s")

t0 = time.time()
USER_INDEX    = build_user_index(ENGAGEMENT)     # {user_id: [records]}
print(f"[lambda] USER_INDEX built in {time.time() - t0:.2f}s")

t0 = time.time()
RANKED_PLAYERS = get_ranked_players()            # 34 Bayern players, scored
print(f"[lambda] RANKED_PLAYERS computed in {time.time() - t0:.2f}s")

total_time = time.time() - start_time
print(f"[lambda] cold start complete in {total_time:.2f}s")


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
        print(f"[lambda] WARNING: invalid tactical_style '{tactical_style}', using default 'High Press'")
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


def handle_analyze_sub(body: dict) -> dict:
    """
    POST /analyze-sub
    Required: match_id, team_id, starter_person_id, bench_person_id
    Returns: Bedrock tactical substitution analysis
    """
    match_id         = body.get('match_id', '')
    team_id          = body.get('team_id', '')
    starter_id       = body.get('starter_person_id', '')
    bench_id         = body.get('bench_person_id', '')

    if not all([match_id, team_id, starter_id, bench_id]):
        return _error(400, "match_id, team_id, starter_person_id, bench_person_id required")

    # Parse match
    match = parse_match(match_id)
    if not match:
        return _error(404, f"Match {match_id} not found")

    # Get schedule info for opponent name
    players  = STATIC_DATA['players']

    # Determine opponent
    is_home   = match['home_team_id'] == team_id
    clubs = STATIC_DATA['clubs']
    opponent_id = match['guest_team_id'] if is_home else match['home_team_id']
    opponent = clubs.get(opponent_id, {}).get('short_name', 'Unknown')
    formation = match['formation_home'] if is_home else match['formation_guest']
    lineup    = match['home_lineup'] if is_home else match['guest_lineup']

    # Find starter and bench player in lineup
    starter_entry = next((p for p in lineup if p['person_id'] == starter_id and p['starting']), None)
    bench_entry   = next((p for p in lineup if p['person_id'] == bench_id and not p['starting']), None)

    if not starter_entry:
        return _error(404, f"Starter {starter_id} not found in match lineup")
    if not bench_entry:
        return _error(404, f"Bench player {bench_id} not found in match lineup")

    # Enrich with player names
    starter_info = players.get(starter_id, {})
    bench_info   = players.get(bench_id, {})

    starter_player = {
        'name': f"{starter_info.get('first_name','')} {starter_info.get('last_name','')}".strip(),
        'playing_position': starter_entry.get('playing_position', '')
    }
    bench_player = {
        'name': f"{bench_info.get('first_name','')} {bench_info.get('last_name','')}".strip(),
        'playing_position': bench_entry.get('playing_position', '')
    }

    # Get season stats — Bayern players only
    ranked = {p['player_id']: p for p in RANKED_PLAYERS}
    starter_stats = ranked.get(starter_id, {})
    bench_stats   = ranked.get(bench_id, {})

    has_deep_stats = bool(starter_stats and bench_stats)

    # Check position compatibility
    starter_pos = starter_player.get('playing_position', '').upper()
    bench_pos = bench_player.get('playing_position', '').upper()
    position_mismatch = starter_pos != bench_pos

    match_context = {
        'match_day': match['match_day'],
        'opponent':  opponent,
        'result':    match['result'],
        'formation': formation,
    }

    # Run Bedrock analysis
    from bedrock_handler import analyze_substitution
    analysis = analyze_substitution(
        match_context, starter_player, bench_player,
        starter_stats, bench_stats
    )

    return _response(200, {
        'match_id':       match_id,
        'match_day':      match['match_day'],
        'opponent':       opponent,
        'result':         match['result'],
        'starter':        starter_player,
        'bench_player':   bench_player,
        'has_deep_stats': has_deep_stats,
        'starter_stats':  {
            'impact_score':        starter_stats.get('impact_score', 0),
            'xg':                  round(starter_stats.get('xg', 0), 2),
            'participations_goal': starter_stats.get('participations_goal', 0),
            'dist_per90_km':       round(starter_stats.get('dist_per90', 0)/1000, 2),
        } if has_deep_stats else {},
        'bench_stats': {
            'impact_score':        bench_stats.get('impact_score', 0),
            'xg':                  round(bench_stats.get('xg', 0), 2),
            'participations_goal': bench_stats.get('participations_goal', 0),
            'dist_per90_km':       round(bench_stats.get('dist_per90', 0)/1000, 2),
        } if has_deep_stats else {},
        'analysis': analysis,
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