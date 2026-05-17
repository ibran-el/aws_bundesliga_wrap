# backend/engagement_mapper.py
"""
Loads engagement JSON from S3, aggregates per-user records into
a single Wrapped profile dict. No Bedrock calls here.
Single responsibility: JSON → user Wrapped profile.
"""

import boto3
import json
from config import S3_BUCKET, S3_REGION, S3_KEYS

s3 = boto3.client('s3', region_name=S3_REGION)

# ── LOADER ───────────────────────────────────────────────────────────

def load_engagement_data() -> list[dict]:
    """
    Fetches full engagement JSON from S3.
    Returns raw list of 26,242 records.
    Call once at Lambda cold start.
    """
    resp = s3.get_object(Bucket=S3_BUCKET, Key=S3_KEYS["engagement"])
    raw = resp['Body'].read()
    data = json.loads(raw)
    
    # Validate data structure
    if not isinstance(data, list):
        print(f"[engagement_mapper] ERROR: engagement data is not a list, got {type(data)}")
        return []
    
    if not data:
        print(f"[engagement_mapper] ERROR: engagement data is empty")
        return []
    
    # Validate first record has expected fields
    first_record = data[0]
    expected_fields = ['user_id', 'favorite_club', 'age_group', 'country']
    missing_fields = [f for f in expected_fields if f not in first_record]
    if missing_fields:
        print(f"[engagement_mapper] WARNING: engagement records missing fields: {missing_fields}")
    
    print(f"[engagement_mapper] loaded {len(data)} records")
    return data


# ── AGGREGATOR ───────────────────────────────────────────────────────

def aggregate_user(records: list[dict]) -> dict:
    """
    Takes all monthly records for ONE user.
    Returns a single aggregated Wrapped profile.
    """
    if not records:
        return {}

    # Use first record for static profile fields
    base = records[0]

    # Nullable int sum helper
    def sum_field(field):
        return sum(r.get(field) or 0 for r in records)

    def max_field(field):
        vals = [r.get(field) or 0 for r in records]
        return max(vals)

    # Content consumption totals
    total_articles     = sum_field('article_view_count')
    total_stories      = sum_field('story_view_count')
    total_videos       = sum_field('video_view_count')

    # Screen view totals
    total_match_center = sum_field('screen_view_match_center_total_count')
    total_home         = sum_field('screen_view_home_count')
    total_table        = sum_field('screen_view_table_count')
    total_stats_tab    = sum_field('screen_view_match_center_stats_count')
    total_lineups_tab  = sum_field('screen_view_match_center_lineups_count')

    # Favorite video — most frequent non-null value
    video_titles = [r.get('favorite_video_title')
                    for r in records if r.get('favorite_video_title')]
    favorite_video = max(set(video_titles),
                         key=video_titles.count) if video_titles else None

    # Active months
    active_months = len(records)

    # Engagement intensity score (0–100, used for Bedrock context)
    total_interactions = total_articles + total_stories + total_videos
    # Rough percentile proxy — cap at 500 interactions = 100 score
    engagement_score = min(round(total_interactions / 500 * 100), 100)

    # Fan archetype signals
    is_stats_nerd    = total_stats_tab > total_home
    is_lineup_watcher = total_lineups_tab > 5
    is_video_fan     = total_videos > total_articles

    archetype = _derive_archetype(
        is_stats_nerd, is_lineup_watcher, is_video_fan,
        total_match_center, total_interactions
    )

    return {
        # Identity
        'user_id':        base.get('user_id', '').strip("'"),
        'age_group':      base.get('age_group', ''),
        'country':        base.get('country', ''),
        'favorite_club':  base.get('favorite_club', ''),
        'gender':         base.get('gender', ''),
        'platform':       base.get('platform', ''),
        'language':       base.get('language', ''),

        # Season totals
        'total_articles':      total_articles,
        'total_stories':       total_stories,
        'total_videos':        total_videos,
        'total_match_center':  total_match_center,
        'total_interactions':  total_interactions,
        'active_months':       active_months,
        'favorite_video':      favorite_video,

        # Scores
        'engagement_score': engagement_score,

        # Archetype
        'archetype':          archetype,
        'is_stats_nerd':      is_stats_nerd,
        'is_lineup_watcher':  is_lineup_watcher,
        'is_video_fan':       is_video_fan,
    }


def _derive_archetype(stats_nerd, lineup_watcher,
                      video_fan, match_center, total) -> str:
    """
    Maps behavioral signals to one of 5 fan archetypes.
    Used as Bedrock prompt context and UI label.
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


# ── USER LOOKUP ──────────────────────────────────────────────────────

def build_user_index(data: list[dict]) -> dict:
    """
    Groups all records by user_id.
    Returns: {user_id: [record, record, ...]}
    Call once after load_engagement_data().
    """
    index = {}
    for record in data:
        uid = record.get('user_id', '').strip("'")
        if uid not in index:
            index[uid] = []
        index[uid].append(record)
    print(f"[engagement_mapper] user index built: {len(index)} users")
    return index


def get_user_profile(user_id: str, index: dict) -> dict:
    """
    Returns aggregated Wrapped profile for a specific user_id.
    Returns empty dict if user not found.
    """
    records = index.get(user_id.strip("'"), [])
    if not records:
        print(f"[engagement_mapper] WARNING: user {user_id} not found")
        return {}
    return aggregate_user(records)


def get_club_cohort_profile(favorite_club: str,
                             data: list[dict]) -> dict:
    """
    Aggregates profile for ALL users of a given club.
    Used when judge inputs a club but no matching user_id exists.
    Returns averaged/summed cohort stats as a synthetic profile.
    """
    if not favorite_club:
        return {}
    
    # Exact match first
    club_records = [r for r in data if r.get('favorite_club', '') == favorite_club]
    
    # If no exact match, try case-insensitive match
    if not club_records:
        favorite_club_lower = favorite_club.lower()
        club_records = [r for r in data 
                       if r.get('favorite_club', '').lower() == favorite_club_lower]
    
    if not club_records:
        print(f"[engagement_mapper] WARNING: no users for {favorite_club}")
        return {}

    print(f"[engagement_mapper] cohort for {favorite_club}: {len(club_records)} records")
    return aggregate_user(club_records)
