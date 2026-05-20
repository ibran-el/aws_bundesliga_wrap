import json
from collections import Counter

with open('tests/data/engagement.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# ── 1. Bayern users with video titles ──────────────────────────────────
bayern_records = [r for r in data if r.get('favorite_club') == 'FC Bayern München']
bayern_with_video = [r for r in bayern_records if r.get('favorite_video_title')]
print(f"=== BAYERN VIDEO ANALYSIS ===")
print(f"Bayern records total: {len(bayern_records)}")
print(f"Bayern records with video title: {len(bayern_with_video)} ({len(bayern_with_video)/len(bayern_records)*100:.1f}%)")

# Unique Bayern video titles
bavaria_titles = Counter(r['favorite_video_title'] for r in bayern_with_video)
print(f"Unique Bayern video titles: {len(bavaria_titles)}")
print("\nTop 30 Bayern video titles by frequency:")
for title, count in bavaria_titles.most_common(30):
    print(f"  {count:3d}x  {title}")

# ── 2. Our S3 keywords vs actual Bayern titles ─────────────────────────
keywords = ['kane', 'musiala', 'müller', 'muller', 'davies', 'meister', 'champion', 'bier', 'beer', 'hat-trick', 'gnabry', 'coman', 'sané', 'sane', 'kimmich', 'goretzka', 'müller', 'neuer', 'díaz', 'diaz']
print("\n=== KEYWORD MATCH RATE FOR BAYERN USERS ===")
matched = 0
unmatched_titles = []
for r in bayern_with_video:
    title_lower = r['favorite_video_title'].lower()
    if any(kw in title_lower for kw in keywords):
        matched += 1
    else:
        unmatched_titles.append(r['favorite_video_title'])
print(f"Matched to a keyword: {matched} ({matched/len(bayern_with_video)*100:.1f}%)")
print(f"Unmatched:            {len(unmatched_titles)} ({len(unmatched_titles)/len(bayern_with_video)*100:.1f}%)")
print("\nSample unmatched titles (first 20):")
for t in sorted(set(unmatched_titles))[:20]:
    print(f"  {t}")

# ── 3. Country cluster analysis ────────────────────────────────────────
print("\n=== COUNTRY DISTRIBUTION ===")
country_counts = Counter(r.get('country', 'NULL') for r in data if r.get('country'))
print("Top 15 countries:")
for country, count in country_counts.most_common(15):
    print(f"  {country}: {count:,} records")

# ── 4. Age group distribution ──────────────────────────────────────────
print("\n=== AGE GROUP DISTRIBUTION ===")
age_counts = Counter(r.get('age_group', 'NULL') for r in data if r.get('age_group'))
for age, count in sorted(age_counts.items()):
    print(f"  {age}: {count:,} records")

# ── 5. Bundesliga 2 clubs viability ────────────────────────────────────
print("\n=== BUNDESLIGA 2 CANDIDATE CLUBS ===")
bl1 = {
    'FC Bayern München','Borussia Dortmund','Bayer 04 Leverkusen','RB Leipzig',
    'Eintracht Frankfurt','VfB Stuttgart','Sport-Club Freiburg','SV Werder Bremen',
    'Borussia Mönchengladbach','VfL Wolfsburg','1. FSV Mainz 05','FC Augsburg',
    '1. FC Union Berlin','TSG Hoffenheim','1. FC Heidenheim 1846','FC St. Pauli',
    'VfL Bochum 1848','Holstein Kiel',
}
all_clubs = Counter(r.get('favorite_club') for r in data if r.get('favorite_club'))
bl2_clubs = {k: v for k, v in all_clubs.items() if k not in bl1}
bl2_sorted = sorted(bl2_clubs.items(), key=lambda x: -x[1])
print(f"Non-BL1 clubs with user data ({len(bl2_sorted)}):")
for club, count in bl2_sorted:
    users = len(set(r.get('user_id','').strip("'") for r in data
                    if r.get('favorite_club') == club and r.get('user_id')))
    print(f"  {count:4d} records, {users:3d} users  →  {club}")

# ── 6. Content diet analysis ───────────────────────────────────────────
print("\n=== CONTENT DIET (per record, non-null only) ===")
has_articles = sum(1 for r in data if r.get('article_view_count'))
has_stories  = sum(1 for r in data if r.get('story_view_count'))
has_videos   = sum(1 for r in data if r.get('video_view_count'))
has_mc       = sum(1 for r in data if r.get('screen_view_match_center_total_count'))
total = len(data)
print(f"article_view_count not null:         {has_articles:,} ({has_articles/total*100:.1f}%)")
print(f"story_view_count not null:           {has_stories:,} ({has_stories/total*100:.1f}%)")
print(f"video_view_count not null:           {has_videos:,} ({has_videos/total*100:.1f}%)")
print(f"match_center_total not null:         {has_mc:,} ({has_mc/total*100:.1f}%)")
