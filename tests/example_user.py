import json
from collections import defaultdict

with open('tests/data/engagement.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

users = defaultdict(list)
for r in data:
    uid = (r.get('user_id') or '').strip("'")
    if uid:
        users[uid].append(r)

# Pick richest Bayern user with video title
candidates = {}
for uid, recs in users.items():
    if not any(r.get('favorite_club') == 'FC Bayern München' for r in recs):
        continue
    if not any(r.get('favorite_video_title') for r in recs):
        continue
    if len(recs) < 6:
        continue
    total = sum(
        (r.get('article_view_count') or 0) +
        (r.get('story_view_count') or 0) +
        (r.get('video_view_count') or 0) +
        (r.get('screen_view_match_center_total_count') or 0)
        for r in recs
    )
    candidates[uid] = total

example_uid = max(candidates, key=candidates.get)
recs = sorted(users[example_uid], key=lambda r: r.get('month', ''))

print(f'User: {example_uid[:16]}...')
print(f'Months: {len(recs)}, Total activity score: {candidates[example_uid]}')
print()
for r in recs:
    print(
        f"  {r['month']}  "
        f"art={r.get('article_view_count') or 0:3d}  "
        f"story={r.get('story_view_count') or 0:3d}  "
        f"vid={r.get('video_view_count') or 0:3d}  "
        f"mc={r.get('screen_view_match_center_total_count') or 0:4d}  "
        f"ticker={r.get('screen_view_match_center_ticker_count') or 0:3d}  "
        f"stats={r.get('screen_view_match_center_stats_count') or 0:3d}  "
        f"lineups={r.get('screen_view_match_center_lineups_count') or 0:3d}  "
        f"| {r.get('favorite_video_title') or '-'}"
    )

# Stats
peak_m = max(recs, key=lambda r: (
    (r.get('article_view_count') or 0) +
    (r.get('story_view_count') or 0) +
    (r.get('video_view_count') or 0) +
    (r.get('screen_view_match_center_total_count') or 0)
))
print(f"\nPeak month: {peak_m['month']}")
print(f"Country: {recs[0].get('country')}, Age: {recs[0].get('age_group')}, Platform: {recs[0].get('platform')}")

total_ticker  = sum(r.get('screen_view_match_center_ticker_count') or 0 for r in recs)
total_stats   = sum(r.get('screen_view_match_center_stats_count') or 0 for r in recs)
total_lineups = sum(r.get('screen_view_match_center_lineups_count') or 0 for r in recs)
total_articles= sum(r.get('article_view_count') or 0 for r in recs)
total_stories = sum(r.get('story_view_count') or 0 for r in recs)
total_videos  = sum(r.get('video_view_count') or 0 for r in recs)

print(f"\nFull season: articles={total_articles}, stories={total_stories}, videos={total_videos}")
print(f"Match Center: ticker={total_ticker}, stats={total_stats}, lineups={total_lineups}")
