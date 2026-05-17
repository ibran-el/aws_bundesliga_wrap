# run from tests/
import json

with open('data/engagement.json') as f:
    pass  # don't need this

# Read schedule directly
import sys
sys.path.insert(0, '../backend')

# Set profile
import boto3
import botocore

session = boto3.Session(profile_name='emrys-dev')
import xml_parser
xml_parser.s3 = session.client('s3', region_name='eu-central-1')

schedule = xml_parser.parse_schedule()
bayern_id = 'DFL-CLU-00000G'
bayern_matches = {
    mid: fix for mid, fix in schedule.items()
    if fix['home_team_id'] == bayern_id or fix['guest_team_id'] == bayern_id
}
print(f"Bayern matches: {len(bayern_matches)}")
for mid, fix in list(bayern_matches.items())[:5]:
    print(f"{mid} | MD{fix['match_day']} | {fix['home_name']} vs {fix['guest_name']}")