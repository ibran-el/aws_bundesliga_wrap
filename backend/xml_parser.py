# backend/xml_parser.py
"""
Loads and parses all DFL XML files from S3 into memory dicts.
Single responsibility: XML → Python dicts. No stats logic here.
"""

import boto3
import xml.etree.ElementTree as ET
from config import S3_BUCKET, S3_REGION, S3_KEYS, CLUB_IDS, S3_SEASON_ID

s3 = boto3.client('s3', region_name=S3_REGION)
season_id = S3_SEASON_ID

# ── UTILITIES ────────────────────────────────────────────────────────

def _fetch_xml(s3_key: str) -> ET.Element:
    """Fetch XML from S3, return root Element."""
    resp = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
    content = resp['Body'].read()
    content = content.decode('utf-8')
    return ET.fromstring(content)


def _fetch_json_bytes(s3_key: str) -> bytes:
    """Fetch raw bytes for JSON files."""
    resp = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
    return resp['Body'].read()


# ── CLUBS ────────────────────────────────────────────────────────────

def parse_clubs() -> dict:
    """
    Returns: {club_id: {name, short_name, three_letter_code,
                        primary_color_hex, secondary_color_hex}}
    """
    root = _fetch_xml(S3_KEYS["clubs"])
    clubs = {}

    for club in root.iter('Club'):
        club_id = club.get('ClubId')
        if not club_id:
            continue

        # Extract hex colors — first two ClubColor entries
        colors = [c.get('HexRGB', '#FFFFFF')
                  for c in club.findall('.//ClubColor')]
        primary   = colors[0] if len(colors) > 0 else '#FFFFFF'
        secondary = colors[1] if len(colors) > 1 else '#000000'

        clubs[club_id] = {
            'name':               club.get('ClubName', ''),
            'long_name':          club.get('LongName', ''),
            'short_name':         club.get('ShortName', ''),
            'three_letter_code':  club.get('ThreeLetterCode', ''),
            'stadium_name':       club.get('StadiumName', ''),
            'primary_color':   f'#{primary.lstrip("#")}',
            'secondary_color': f'#{secondary.lstrip("#")}',
        }

    print(f"[xml_parser] clubs loaded: {len(clubs)}")
    return clubs


# ── PLAYERS ─────────────────────────────────────────────────────────

def parse_players_for_club(club_id: str, season_id: str = '0001K8') -> dict:
    """
    Fetches the player roster XML for one club.
    Returns: {object_id: {first_name, last_name, shirt_number,
                          playing_position, height, weight,
                          birth_date, club_id}}
    """
    # Filename pattern: 01.05.<ClubId>_<SeasonId>.xml
    key = S3_KEYS["players_prefix"] + f"01.05.{club_id}_DFL-SEA-{season_id}.xml"
    print(f"[xml_parser] loading players for {club_id} from {key}")

    if club_id not in CLUB_IDS.values():
        print(f"[xml_parser] WARNING: unknown club ID {club_id}")
        return {}
    if not key.startswith(S3_KEYS["players_prefix"]):
        print(f"[xml_parser] WARNING: potential S3 path traversal attempt with {key}")
        return {}

    try:
        root = _fetch_xml(key)
    except Exception as e:
        error_type = type(e).__name__
        if "NoSuchKey" in error_type or "404" in str(e):
            print(f"[xml_parser] WARNING: players file not found for {club_id}: {key}")
        else:
            print(f"[xml_parser] WARNING: could not load players for {club_id}: {error_type}: {e}")
        return {}

    players = {}
    for obj in root.iter('Object'):
        obj_id = obj.get('ObjectId')
        if not obj_id:
            continue
        players[obj_id] = {
            'first_name':       obj.get('FirstName', ''),
            'last_name':        obj.get('LastName', ''),
            'alias':            obj.get('Alias', ''),
            'shirt_number':     obj.get('ShirtNumber', ''),
            'playing_position': obj.get('PlayingPosition', ''),
            'height':           obj.get('Height', ''),
            'weight':           obj.get('Weight', ''),
            'birth_date':       obj.get('BirthDate', ''),
            'club_id':          obj.get('ClubId', ''),
        }

    print(f"[xml_parser] players loaded for {club_id}: {len(players)}")
    return players


def parse_all_players() -> dict:
    """
    Loads rosters for all 18 clubs.
    Returns: {object_id: player_dict}  (flat — ObjectId is globally unique)
    """
    all_players = {}
    for code, club_id in CLUB_IDS.items():
        roster = parse_players_for_club(club_id)
        all_players.update(roster)
    print(f"[xml_parser] total players loaded: {len(all_players)}")
    return all_players


# ── SCHEDULE ─────────────────────────────────────────────────────────

def parse_schedule() -> dict:
    """
    Returns: {match_id: {match_day, kickoff_time,
                         home_team_id, guest_team_id,
                         home_name, guest_name}}
    """
    root = _fetch_xml(S3_KEYS["schedule"])
    schedule = {}

    for fixture in root.iter('Fixture'):
        match_id = fixture.get('MatchId')
        if not match_id:
            continue
        schedule[match_id] = {
            'match_day':     fixture.get('MatchDay', ''),
            'kickoff_time':  fixture.get('PlannedKickoffTime', ''),
            'home_team_id':  fixture.get('HomeTeamId', ''),
            'guest_team_id': fixture.get('GuestTeamId', ''),
            'home_name':     fixture.get('HomeTeamShortName', ''),  # ← may not exist in XML
            'guest_name':    fixture.get('GuestTeamShortName', ''),
        }

    print(f"[xml_parser] fixtures loaded: {len(schedule)}")
    return schedule


# ── SINGLE MATCH ─────────────────────────────────────────────────────

def parse_match(match_id: str) -> dict:
    """
    Parses one match XML.
    Returns: {match_id, result, home_team_id, guest_team_id,
              match_day, formation_home, formation_guest,
              spectators, temperature,
              home_lineup: [{person_id, shirt_number, starting,
                             playing_position, team_leader}],
              guest_lineup: [...]}
    """
    key = S3_KEYS["matches_prefix"] + f"{match_id}.xml"
    try:
        root = _fetch_xml(key)
    except Exception as e:
        print(f"[xml_parser] WARNING: match {match_id} not found: {e}")
        return {}

    general = root.find('.//General')
    env     = root.find('.//Environment')

    result = {
        'match_id':      match_id,
        'result':        general.get('Result', '') if general is not None else '',
        'match_day':     general.get('MatchDay', '') if general is not None else '',
        'home_team_id':  general.get('HomeTeamId', '') if general is not None else '',
        'guest_team_id': general.get('GuestTeamId', '') if general is not None else '',
        'spectators':    env.get('NumberOfSpectators', '') if env is not None else '',
        'temperature':   env.get('Temperature', '') if env is not None else '',
        'home_lineup':   [],
        'guest_lineup':  [],
        'formation_home':  '',
        'formation_guest': '',
    }

    for team in root.findall('.//Teams/Team'):
        role      = team.get('Role', '')
        formation = team.get('LineUp', '')
        lineup_key = 'home_lineup' if role == 'home' else 'guest_lineup'
        formation_key = 'formation_home' if role == 'home' else 'formation_guest'
        result[formation_key] = formation

        for player in team.findall('.//Players/Player'):
            result[lineup_key].append({
                'person_id':       player.get('PersonId', ''),
                'shirt_number':    player.get('ShirtNumber', ''),
                'starting':        player.get('Starting', 'false') == 'true',
                'playing_position': player.get('PlayingPosition', ''),
                'team_leader':     player.get('TeamLeader', 'false') == 'true',
            })

    return result


def get_bench_players(match: dict, team_id: str) -> list:
    """
    Returns list of bench players (Starting=false) for a given team in a match.
    Used by substitution simulator.
    """
    if match.get('home_team_id') == team_id:
        lineup = match.get('home_lineup', [])
    else:
        lineup = match.get('guest_lineup', [])

    return [p for p in lineup if not p['starting']]


# ── CACHE LOADER (call once at Lambda init) ──────────────────────────

def load_all_static_data() -> dict:
    """
    Entry point for Lambda cold start.
    Loads clubs + all 18 rosters + schedule into memory.
    Match XMLs are fetched on-demand (306 files = too large to bulk load).
    Returns: {clubs, players, schedule}
    """
    print("[xml_parser] loading static data...")
    return {
        'clubs':    parse_clubs(),
        'players':  parse_all_players(),
        'schedule': parse_schedule(),
    }