import json

with open('data/engagement.json', encoding='utf-8') as f:
    data = json.load(f)

clubs = list(set(r.get('favorite_club') for r in data if r.get('favorite_club')))
clubs.sort()
for c in clubs[:25]:
    print(repr(c))

# add to diag_test.py
def normalize(s):
    return s.lower().replace('ü','u').replace('ö','o').replace('ä','a')

target = normalize('FC Bayern München')
matches = [r for r in data if normalize(r.get('favorite_club','')) == target]
print(f"Bayern matches: {len(matches)}")
print(repr(target))