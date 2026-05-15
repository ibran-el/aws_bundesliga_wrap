#!/bin/bash
# Packages backend + dependencies into lambda.zip
# Run from project root: bash deploy/build_lambda.sh

set -e

echo "=== Building Lambda deployment package ==="

# Clean previous build
rm -rf deploy/package deploy/lambda.zip

# Install dependencies into package dir
mkdir -p deploy/package
pip install numpy scipy boto3 -t deploy/package/ --quiet

# Copy backend source
cp backend/*.py deploy/package/

# Zip everything
cd deploy/package
zip -r ../lambda.zip . -x "*.pyc" -x "__pycache__/*"
cd ../..

echo "=== Build complete: deploy/lambda.zip ==="
ls -lh deploy/lambda.zip