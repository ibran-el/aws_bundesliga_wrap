# backend/stats_processor.py
"""
Parses Bayern stats XML and computes Z-score Impact Scores.
Single responsibility: stats XML → ranked player scores.
Depends on: config.py only. No S3 calls — receives raw XML bytes.
"""

import boto3
import xml.etree.ElementTree as ET
import numpy as np
from config import S3_BUCKET, S3_REGION, S3_KEYS, IMPACT_WEIGHTS

s3 = boto3.client('s3', region_name=S3_REGION)


# ── RAW STATS EXTRACTION ─────────────────────────────────────────────

def fetch_bayern_stats_xml() -> ET.Element:
    resp = s3.get_object(Bucket=S3_BUCKET, Key=S3_KEYS["bayern_stats"])
    return ET.fromstring(resp['Body'].read())


def extract_player_stats(root: ET.Element) -> list[dict]:
    """
    Extracts raw stat dicts for all 34 Bayern players.
    Returns list of dicts — one per PlayerStatistic element.
    All numeric fields cast to float. Missing → 0.0.
    """
    players = []

    for ps in root.iter('PlayerStatistic'):
        def f(attr): 
            val = ps.get(attr, '0') or '0'
            try:
                return float(val)
            except ValueError:
                return 0.0

        def t(attr):
            """Parse HH:MM:SS playing time → minutes float."""
            val = ps.get(attr, '0:00:00') or '0:00:00'
            try:
                parts = val.split(':')
                return int(parts[0]) * 60 + int(parts[1]) + int(parts[2]) / 60
            except Exception:
                return 0.0

        playing_minutes = t('PlayingTime')

        players.append({
            # Identity
            'player_id':   ps.get('PlayerId', ''),
            'first_name':  ps.get('PlayerFirstName', ''),
            'last_name':   ps.get('PlayerLastName', ''),
            'alias':       ps.get('Alias', ''),
            'is_gk':       ps.get('GoalKeeper', 'false') == 'true',

            # Playing time
            'playing_minutes':           playing_minutes,
            'normalized_player_minutes': f('NormalizedPlayerMinutes'),

            # Goal contribution
            'participations_goal': f('ParticipationsGoal'),
            'xg_efficiency':       f('xGEfficiency'),
            'xg':                  f('xG'),

            # Attacking
            'assists_shot_at_goal': f('AssistsShotAtGoal'),

            # Physical
            'distance_covered': f('DistanceCovered'),   # meters
            'maximum_speed':    f('MaximumSpeed'),       # km/h

            # Defensive (use available fields)
            'duels_won':          f('DuelsWon'),
            'defensive_actions':  f('BallRecoveries'),  # proxy

            # Per-90 derived
            'xg_per90': (f('xG') / playing_minutes * 90) if playing_minutes > 0 else 0.0,
            'dist_per90': (f('DistanceCovered') / playing_minutes * 90) if playing_minutes > 0 else 0.0,
        })

    print(f"[stats_processor] raw stats extracted: {len(players)} players")
    return players


# ── Z-SCORE ENGINE ───────────────────────────────────────────────────

def _zscore(values: np.ndarray) -> np.ndarray:
    """Z-score normalize. Returns zeros if std == 0."""
    std = values.std()
    if std == 0:
        return np.zeros_like(values)
    return (values - values.mean()) / std


def _scale_to_100(zscores: np.ndarray) -> np.ndarray:
    """Map z-scores to 0–100 range."""
    min_z, max_z = zscores.min(), zscores.max()
    if max_z == min_z:
        return np.full_like(zscores, 50.0)
    return (zscores - min_z) / (max_z - min_z) * 100


def compute_impact_scores(players: list[dict]) -> list[dict]:
    """
    Computes weighted Impact Score (0–100) for each player.
    Adds 'impact_score' and per-component scores to each dict.
    Returns list sorted by impact_score descending.
    """
    n = len(players)

    # Build component arrays
    goal_contribution = np.array([
        p['participations_goal'] + max(p['xg_efficiency'], 0)
        for p in players
    ])
    attacking_output = np.array([
        p['assists_shot_at_goal'] + p['xg']
        for p in players
    ])
    physical_dominance = np.array([
        p['dist_per90'] + p['maximum_speed']
        for p in players
    ])
    defensive_work = np.array([
        p['duels_won'] + p['defensive_actions']
        for p in players
    ])
    availability = np.array([
        p['normalized_player_minutes']
        for p in players
    ])

    # Z-score + scale each component
    gc_s  = _scale_to_100(_zscore(goal_contribution))
    ao_s  = _scale_to_100(_zscore(attacking_output))
    pd_s  = _scale_to_100(_zscore(physical_dominance))
    dw_s  = _scale_to_100(_zscore(defensive_work))
    av_s  = _scale_to_100(_zscore(availability))

    w = IMPACT_WEIGHTS
    impact = (
        gc_s  * w['goal_contribution']   +
        ao_s  * w['attacking_output']    +
        pd_s  * w['physical_dominance']  +
        dw_s  * w['defensive_work']      +
        av_s  * w['availability']
    )

    # Write scores back into player dicts
    for i, p in enumerate(players):
        p['impact_score']            = round(float(impact[i]), 2)
        p['score_goal_contribution'] = round(float(gc_s[i]), 2)
        p['score_attacking_output']  = round(float(ao_s[i]), 2)
        p['score_physical']          = round(float(pd_s[i]), 2)
        p['score_defensive']         = round(float(dw_s[i]), 2)
        p['score_availability']      = round(float(av_s[i]), 2)

    players.sort(key=lambda x: x['impact_score'], reverse=True)
    print(f"[stats_processor] impact scores computed. MVP: "
          f"{players[0]['first_name']} {players[0]['last_name']} "
          f"({players[0]['impact_score']})")
    return players


# ── PUBLIC ENTRY POINT ───────────────────────────────────────────────

def get_ranked_players() -> list[dict]:
    """
    Full pipeline: fetch XML → extract → score → rank.
    Call this from Lambda or tests.
    """
    root    = fetch_bayern_stats_xml()
    players = extract_player_stats(root)
    ranked  = compute_impact_scores(players)
    return ranked


def get_top_n(n: int = 3) -> list[dict]:
    """Returns top N players by Impact Score."""
    return get_ranked_players()[:n]