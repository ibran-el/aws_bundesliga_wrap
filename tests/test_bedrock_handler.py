# tests/test_bedrock_handler.py
import sys
sys.path.insert(0, '../backend')

from stats_processor import get_top_n
from engagement_mapper import (load_engagement_data,
                                build_user_index,
                                get_club_cohort_profile)
from bedrock_handler import run_full_pipeline

def test_full_pipeline():
    # Real top 3 players
    top3 = get_top_n(3)

    # Use Bayern cohort as synthetic user profile
    print("[test] loading engagement data...")
    data = load_engagement_data()
    profile = get_club_cohort_profile('FC Bayern München', data)

    if not profile:
        # Try alternate club name spellings
        clubs = list(set(r.get('favorite_club','') for r in data[:500]))
        print(f"[test] available club names sample: {clubs[:10]}")
        profile = {
            'favorite_club': 'FC Bayern München',
            'archetype': 'Tactical Mastermind',
            'active_months': 10,
            'total_interactions': 280,
            'favorite_video': 'Kane goals compilation',
            'engagement_score': 85
        }

    result = run_full_pipeline(top3, profile, 'High Press')

    assert 'mvp_analysis' in result
    assert 'scout_report' in result
    assert 'wrapped_card' in result
    assert result['mvp_analysis'].get('mvp'), "MVP name missing"
    assert result['scout_report'].get('headline'), "Headline missing"
    assert result['wrapped_card'].get('season_verdict'), "Verdict missing"

    print("\n✓ Full pipeline passed\n")
    print("=== MVP ANALYSIS ===")
    print(f"  MVP: {result['mvp_analysis']['mvp']}")
    print(f"  Reason: {result['mvp_analysis']['mvp_reason']}")
    print("\n=== SCOUT REPORT ===")
    print(f"  Headline: {result['scout_report']['headline']}")
    print(f"  Report: {result['scout_report']['scout_report']}")
    print(f"  Season label: {result['scout_report']['season_label']}")
    print(f"  Share: {result['scout_report']['shareable_line']}")
    print("\n=== WRAPPED CARD ===")
    for k, v in result['wrapped_card'].items():
        print(f"  {k}: {v}")

if __name__ == '__main__':
    test_full_pipeline()
    print("\nAll bedrock tests passed")