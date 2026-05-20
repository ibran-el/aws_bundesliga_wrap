import json

with open('tests/data/engagement.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

total = len(data)

# Records with/without video title
with_video = [r for r in data if r.get('favorite_video_title')]
without_video = [r for r in data if not r.get('favorite_video_title')]

# Unique users
all_users = set(r.get('user_id', '').strip("'") for r in data if r.get('user_id'))
users_with_video = set(
    r.get('user_id', '').strip("'")
    for r in with_video if r.get('user_id')
)

# Clubs
clubs = {}
for r in data:
    c = r.get('favorite_club') or 'NULL/MISSING'
    clubs[c] = clubs.get(c, 0) + 1
clubs_sorted = sorted(clubs.items(), key=lambda x: -x[1])

# video_view_count null rate
no_video_count = sum(1 for r in data if r.get('video_view_count') is None)
has_video_count = sum(1 for r in data if r.get('video_view_count') is not None)

# null rates
null_fav_club = sum(1 for r in data if not r.get('favorite_club'))
null_country  = sum(1 for r in data if not r.get('country'))
null_gender   = sum(1 for r in data if not r.get('gender'))
null_age      = sum(1 for r in data if not r.get('age_group'))

# Months
months = sorted(set(r.get('month', '') for r in data if r.get('month')))

# Sample video titles (unique)
unique_titles = list(set(r['favorite_video_title'] for r in with_video))[:30]

# Records per user distribution
from collections import Counter
uid_counts = Counter(r.get('user_id', '').strip("'") for r in data if r.get('user_id'))
users_1_month  = sum(1 for v in uid_counts.values() if v == 1)
users_2_6      = sum(1 for v in uid_counts.values() if 2 <= v <= 6)
users_7_12     = sum(1 for v in uid_counts.values() if 7 <= v <= 12)
max_records    = max(uid_counts.values()) if uid_counts else 0

# Clubs in data vs Clubs.xml 18
bundesliga_1_clubs = {
    'FC Bayern München', 'Borussia Dortmund', 'Bayer 04 Leverkusen',
    'RB Leipzig', 'Eintracht Frankfurt', 'VfB Stuttgart',
    'Sport-Club Freiburg', 'SV Werder Bremen', 'Borussia Mönchengladbach',
    'VfL Wolfsburg', '1. FSV Mainz 05', 'FC Augsburg',
    '1. FC Union Berlin', 'TSG Hoffenheim', '1. FC Heidenheim 1846',
    'FC St. Pauli', 'VfL Bochum 1848', 'Holstein Kiel',
}
all_clubs_in_data = set(r.get('favorite_club') for r in data if r.get('favorite_club'))
not_in_18  = sorted(all_clubs_in_data - bundesliga_1_clubs)
in_18      = sorted(all_clubs_in_data & bundesliga_1_clubs)
clubs_missing_from_data = sorted(bundesliga_1_clubs - all_clubs_in_data)

print('=== ENGAGEMENT DATA AUDIT ===')
print(f'Total records:   {total:,}')
print(f'Unique users:    {len(all_users):,}')
print(f'Months covered:  {months[0]} → {months[-1]} ({len(months)} months)')
print()
print('=== RECORDS PER USER ===')
print(f'Users with 1 month only:    {users_1_month:,}')
print(f'Users with 2-6 months:      {users_2_6:,}')
print(f'Users with 7-12 months:     {users_7_12:,}')
print(f'Max records for one user:   {max_records}')
print()
print('=== VIDEO DATA ===')
print(f'Records WITH favorite_video_title:  {len(with_video):,} ({len(with_video)/total*100:.1f}%)')
print(f'Records WITHOUT:                    {len(without_video):,} ({len(without_video)/total*100:.1f}%)')
print(f'Unique USERS with any video title:  {len(users_with_video):,} of {len(all_users):,} ({len(users_with_video)/len(all_users)*100:.1f}%)')
print(f'Records with video_view_count > 0:  {has_video_count:,} ({has_video_count/total*100:.1f}%)')
print(f'Records with video_view_count NULL: {no_video_count:,} ({no_video_count/total*100:.1f}%)')
print()
print('Sample unique video titles (up to 30):')
for t in sorted(unique_titles):
    print(f'  {t}')
print()
print('=== NULL RATES FOR KEY FIELDS ===')
print(f'favorite_club null/missing: {null_fav_club:,} ({null_fav_club/total*100:.1f}%)')
print(f'country null/missing:       {null_country:,} ({null_country/total*100:.1f}%)')
print(f'gender null/missing:        {null_gender:,} ({null_gender/total*100:.1f}%)')
print(f'age_group null/missing:     {null_age:,} ({null_age/total*100:.1f}%)')
print()
print('=== CLUBS IN DATA vs CLUBS.XML 18 ===')
print(f'Clubs in data that ARE in Bundesliga 1 ({len(in_18)}):')
for c in in_18:
    print(f'  {c}: {clubs.get(c,0)} records')
print()
print(f'Clubs in data NOT in Bundesliga 1 ({len(not_in_18)}):')
for c in not_in_18:
    print(f'  {c}: {clubs.get(c,0)} records')
print()
print(f'Bundesliga 1 clubs MISSING from engagement data ({len(clubs_missing_from_data)}):')
for c in clubs_missing_from_data:
    print(f'  {c}')
print()
print('=== TOP 25 CLUBS BY RECORD COUNT ===')
for club, count in clubs_sorted[:25]:
    print(f'  {count:4d}  {club}')
