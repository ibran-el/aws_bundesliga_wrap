# test_s3.py — run in CloudShell or local with sandbox credentials
import boto3

s3 = boto3.client('s3', region_name='eu-central-1')
bucket = 'hackathon-data-514421696937'
prefix = 'Challenge 1 \u2013 Build Bundesliga Wrapped/data/'  # em-dash

resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=10)
for obj in resp.get('Contents', []):
    print(obj['Key'], obj['Size'])