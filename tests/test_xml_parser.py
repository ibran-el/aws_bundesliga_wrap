# tests/test_xml_parser.py
import sys
sys.path.insert(0, '../backend')

from xml_parser import parse_clubs, parse_players_for_club, parse_schedule, parse_match
from config import CLUB_IDS

def test_clubs():
    clubs = parse_clubs()
    assert len(clubs) == 18, f"Expected 18 clubs, got {len(clubs)}"
    assert 'DFL-CLU-00000G' in clubs
    fcb = clubs['DFL-CLU-00000G']
    assert fcb['three_letter_code'] == 'FCB'
    print("test_clubs passed")

def test_players_bayern():
    players = parse_players_for_club('DFL-CLU-00000G')
    assert len(players) > 0, "No Bayern players loaded"
    sample = next(iter(players.values()))
    assert 'last_name' in sample
    assert 'playing_position' in sample
    print(f"test_players_bayern passed — {len(players)} players")

def test_schedule():
    schedule = parse_schedule()
    assert len(schedule) == 306, f"Expected 306 fixtures, got {len(schedule)}"
    print("test_schedule passed")

def test_match_sample():
    # Get first match ID from schedule
    from xml_parser import parse_schedule
    schedule = parse_schedule()
    match_id = next(iter(schedule))
    match = parse_match(match_id)
    assert 'result' in match
    assert 'home_lineup' in match
    assert len(match['home_lineup']) > 0
    print(f"test_match_sample passed — {match_id}: {match['result']}")

if __name__ == '__main__':
    test_clubs()
    test_players_bayern()
    test_schedule()
    test_match_sample()
    print("\n All xml_parser tests passed")