#!/bin/bash
# Frontend Deployment Script
# Builds and deploys the frontend to S3 and invalidates CloudFront cache

set -e

# Configuration
ENVIRONMENT="${1:-prod}"
STACK_NAME="blueberry-pancake-frontend-${ENVIRONMENT}"
REGION="${AWS_REGION:-us-east-1}"

echo "🚀 Deploying frontend for environment: ${ENVIRONMENT}"

# Get stack outputs
echo "📋 Fetching stack outputs..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text)

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
  echo "❌ Error: Could not fetch stack outputs. Make sure the stack exists."
  exit 1
fi

echo "📦 Building frontend..."
cd frontend
npm ci
npm run build

echo "☁️ Uploading to S3: ${BUCKET_NAME}"
aws s3 sync dist/ "s3://${BUCKET_NAME}/" \
  --delete \
  --region "${REGION}" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.json"

# Upload HTML and JSON files with shorter cache
aws s3 sync dist/ "s3://${BUCKET_NAME}/" \
  --region "${REGION}" \
  --cache-control "public, max-age=60" \
  --include "index.html" \
  --include "*.json"

echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "⏳ Waiting for invalidation to complete..."
aws cloudfront wait invalidation-completed \
  --distribution-id "${DISTRIBUTION_ID}" \
  --id "${INVALIDATION_ID}"

echo ""
echo "✅ Frontend deployed successfully!"
echo "🌐 URL: ${CLOUDFRONT_URL}"
