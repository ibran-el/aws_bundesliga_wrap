# tests/test_stats.py
import sys
sys.path.insert(0, '../backend')

from stats_processor import get_ranked_players, get_top_n

def test_impact_scores():
    players = get_ranked_players()
    assert len(players) == 34, f"Expected 34 players, got {len(players)}"
    
    # Scores in valid range
    for p in players:
        assert 0 <= p['impact_score'] <= 100, \
            f"{p['last_name']} score out of range: {p['impact_score']}"
    
    # Sorted descending
    scores = [p['impact_score'] for p in players]
    assert scores == sorted(scores, reverse=True), "Not sorted correctly"
    
    print("test_impact_scores passed")

def test_top_3():
    top3 = get_top_n(3)
    assert len(top3) == 3
    print("test_top_3 passed")
    print("\nTop 3 Bayern players by Impact Score:")
    for i, p in enumerate(top3, 1):
        print(f"  {i}. {p['first_name']} {p['last_name']:20s} "
              f"Score: {p['impact_score']:6.2f} | "
              f"Goals: {p['participations_goal']:4.0f} | "
              f"xG: {p['xg']:5.2f} | "
              f"Dist/90: {p['dist_per90']:7.1f}m")

if __name__ == '__main__':
    test_impact_scores()
    test_top_3()
    print("\nAll stats tests passed")