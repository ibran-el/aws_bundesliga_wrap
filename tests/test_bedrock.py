# test_bedrock.py
import boto3, json

client = boto3.client('bedrock-runtime', region_name='eu-central-1')
body = json.dumps({
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "Reply with: BEDROCK OK"}]
})

# Try Haiku first
MODEL = "anthropic.claude-3-haiku-20240307-v1:0"
# Fallback: "amazon.nova-lite-v1:0"

resp = client.invoke_model(modelId=MODEL, body=body)
print(json.loads(resp['body'].read()))