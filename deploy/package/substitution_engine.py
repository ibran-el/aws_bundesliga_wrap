#backend/substitution_engine.py 
 

"""
Builds context bundle for Tactical Substitution Simulator.
Inputs: parsed match dict, all_players dict, season_stats dict
Output: bundle dict → bedrock_handler.generate_substitution_analysis()

DEFERRED OQ-DAY5-001: get_substitution_bundle() accepts optional
match_day param so frontend dropdown (Option B) can pass judge-selected
match day without changing Lambda logic.
"""

from config import CLUB_IDS

BAYERN_CLUB_ID = CLUB_IDS["FCB"]  # "DFL-CLU-00000G"


# ── HELPERS ──────────────────────────────────────────────────────────

def _minutes_from_hhmm(t: str) -> float:
    """HH:MM:SS → fractional minutes."""
    if not t:
        return 0.0
    try:
        parts = t.split(":")
        h, m = int(parts[0]), int(parts[1])
        s = int(parts[2]) if len(parts) > 2 else 0
        return h * 60 + m + s / 60
    except (ValueError, IndexError):
        return 0.0


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _per90(value: float, minutes: float) -> float:
    if minutes < 1:
        return 0.0
    return round(value / minutes * 90, 3)


def _duel_win_pct(stats: dict) -> float:
    won  = _safe_float(stats.get("duels_won"))
    lost = _safe_float(stats.get("duels_lost"))
    total = won + lost
    return round(won / total * 100, 1) if total > 0 else 0.0


# ── PLAYER PROFILE ───────────────────────────────────────────────────

def _build_player_profile(person_id: str,
                           all_players: dict,
                           season_stats: dict) -> dict:
    """
    Builds profile dict for one player.
    all_players: {object_id: player_dict} from xml_parser.parse_all_players()
    season_stats: {player_id: stats_dict} from stats_processor
    Keys match xml_parser conventions: first_name, last_name, playing_position
    """
    p = all_players.get(person_id, {})
    name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or person_id

    profile = {
        "person_id":      person_id,
        "name":           name,
        "position":       p.get("playing_position", "Unknown"),
        "has_deep_stats": False,
    }

    if person_id in season_stats:
        s = season_stats[person_id]
        minutes = _minutes_from_hhmm(s.get("playing_time", "0:00:00"))
        profile.update({
            "has_deep_stats":        True,
            "playing_time_minutes":  round(minutes, 1),
            "impact_score":          round(_safe_float(s.get("impact_score")), 2),
            "xg":                    round(_safe_float(s.get("xg")), 3),
            "xg_per90":              _per90(_safe_float(s.get("xg")), minutes),
            "xg_efficiency":         round(_safe_float(s.get("xg_efficiency")), 3),
            "goal_participations":   int(_safe_float(s.get("participations_goal"))),
            "shots_assisted":        int(_safe_float(s.get("assists_shot_at_goal"))),
            "distance_km":           round(_safe_float(s.get("distance_covered")) / 1000, 2),
            "distance_per90":        _per90(_safe_float(s.get("distance_covered")) / 1000, minutes),
            "max_speed_kmh":         round(_safe_float(s.get("maximum_speed")), 1),
            "duel_win_pct":          _duel_win_pct(s),
            "normalized_minutes":    round(_safe_float(s.get("normalized_player_minutes")), 3),
        })

    return profile


# ── STAT DELTA ───────────────────────────────────────────────────────

def _compute_stat_delta(outgoing: dict, incoming: dict) -> dict:
    """Positive delta = incoming is better."""
    if not (outgoing.get("has_deep_stats") and incoming.get("has_deep_stats")):
        return {"deep_stats_available": False}
    return {
        "deep_stats_available":   True,
        "impact_score_delta":     round(incoming["impact_score"]       - outgoing["impact_score"], 2),
        "xg_per90_delta":         round(incoming["xg_per90"]           - outgoing["xg_per90"], 3),
        "distance_per90_delta":   round(incoming["distance_per90"]     - outgoing["distance_per90"], 3),
        "duel_win_pct_delta":     round(incoming["duel_win_pct"]       - outgoing["duel_win_pct"], 1),
        "goal_participations_delta": incoming["goal_participations"]   - outgoing["goal_participations"],
        "xg_efficiency_delta":    round(incoming["xg_efficiency"]      - outgoing["xg_efficiency"], 3),
    }


# ── MAIN BUNDLE ──────────────────────────────────────────────────────

def get_substitution_bundle(outgoing_id: str,
                             incoming_id: str,
                             match: dict,
                             all_players: dict,
                             season_stats: dict,
                             minute: int = 60) -> dict:
    """
    Builds full substitution context bundle for bedrock_handler.
    match dict uses xml_parser keys: home_team_id, guest_team_id,
    result, match_day, formation_home, formation_guest.

    DEFERRED OQ-DAY5-001: caller passes match derived from
    judge-selected match_day (Option B frontend dropdown).
    """
    home_id  = match.get("home_team_id", "")
    guest_id = match.get("guest_team_id", "")
    is_bayern = BAYERN_CLUB_ID in (home_id, guest_id)

    outgoing = _build_player_profile(outgoing_id, all_players, season_stats)
    incoming = _build_player_profile(incoming_id, all_players, season_stats)
    delta    = _compute_stat_delta(outgoing, incoming)

    return {
        "match_context": {
            "match_id":       match.get("match_id"),
            "match_day":      match.get("match_day"),
            "result":         match.get("result", "Unknown"),
            "home_team":      match.get("home_name", home_id),
            "guest_team":     match.get("guest_name", guest_id),
            "formation_home": match.get("formation_home", ""),
            "formation_guest":match.get("formation_guest", ""),
            "minute":         minute,
            "spectators":     match.get("spectators", ""),
        },
        "outgoing_player":  outgoing,
        "incoming_player":  incoming,
        "stat_delta":        delta,
        "is_bayern_match":   is_bayern,
        "analysis_depth":    "deep" if delta.get("deep_stats_available") else "tactical",
    }


# ── LATEST BAYERN MATCH ──────────────────────────────────────────────

def get_latest_bayern_match_id(schedule: dict) -> str:
    """
    Returns match_id of the latest completed Bayern fixture.
    schedule: {match_id: fixture_dict} from xml_parser.parse_schedule()
    fixture_dict keys: match_day, home_team_id, guest_team_id

    NOTE: schedule has no results — caller must call parse_match(match_id)
    and check result != '' to confirm completion.
    """
    bayern_fixtures = [
        (mid, f) for mid, f in schedule.items()
        if BAYERN_CLUB_ID in (f.get("home_team_id", ""), f.get("guest_team_id", ""))
    ]
    # Sort by match_day descending
    bayern_fixtures.sort(key=lambda x: int(x[1].get("match_day", 0)), reverse=True)
    if not bayern_fixtures:
        return ""
    # Return highest match_day — caller verifies result exists
    return bayern_fixtures[0][0]