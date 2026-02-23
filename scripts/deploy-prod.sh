#!/usr/bin/env bash
# Blueberry Pancake - Production deployment script
# Usage: ./scripts/deploy-prod.sh
# Requires: JWT_SECRET, RESEND_API_KEY, ROOT_ADMIN_EMAILS env vars (or edit below)

set -e

ENV=prod

# Required - set via env or edit:
# JWT_SECRET, RESEND_API_KEY, ROOT_ADMIN_EMAILS, CSRF_SECRET, EMAIL_FROM_ADDRESS (required when XSRF enabled)
JWT_SECRET="Mcr7Bs4rFStYBlUrSxRhYOJ+j/kyMTMnE0/2HVCXdA0="
EMAIL_FROM_ADDRESS="${EMAIL_FROM_ADDRESS:-sreeni@7155421.xyz}"  # must be verified in Resend
CSRF_SECRET="${CSRF_SECRET:-$(openssl rand -base64 32)}"
RESEND_API_KEY="re_6RipC75d_PhQmhfHdnnhT542ZaRHjwhqu"
ROOT_ADMIN_EMAILS="sreenivas.talasila@gmail.com"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1. Build backend ==="
sam build

echo ""
echo "=== 2. Deploy backend stack ==="
sam deploy \
  --config-env $ENV \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    JwtSecret="$JWT_SECRET" \
    ResendApiKey="$RESEND_API_KEY" \
    RootAdminEmails="$ROOT_ADMIN_EMAILS" \
    CsrfSecret="$CSRF_SECRET" \
    EmailFromAddress="$EMAIL_FROM_ADDRESS" \
    XsrfEnabled=true \
    FrontendDomain=placeholder

echo ""
echo "=== 3. Deploy frontend stack ==="
API_ID=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiId`].OutputValue' \
  --output text)

sam deploy \
  --template-file template-frontend.yaml \
  --stack-name blueberry-pancake-frontend-$ENV \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ApiId="$API_ID" Environment=$ENV

echo ""
echo "=== 4. Update backend CORS ==="
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-frontend-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text)
FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')

sam deploy \
  --config-env $ENV \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --resolve-s3 \
  --parameter-overrides \
    JwtSecret="$JWT_SECRET" \
    ResendApiKey="$RESEND_API_KEY" \
    RootAdminEmails="$ROOT_ADMIN_EMAILS" \
    CsrfSecret="$CSRF_SECRET" \
    EmailFromAddress="$EMAIL_FROM_ADDRESS" \
    XsrfEnabled=true \
    FrontendDomain="$FRONTEND_DOMAIN"

echo ""
echo "=== 5. Build and sync frontend assets ==="
API_URL=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)
# Frontend calls API Gateway directly (bypasses CloudFront routing issues)
(cd frontend && VITE_API_BASE_URL="${API_URL}/api" npm run build)

BUCKET=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-frontend-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-frontend-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws s3 sync frontend/dist/ s3://$BUCKET/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.json"

aws s3 sync frontend/dist/ s3://$BUCKET/ \
  --cache-control "public, max-age=60" \
  --include "index.html" \
  --include "*.json"

aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"

echo ""
echo "=== Deployment complete ==="
echo "Frontend URL: $FRONTEND_URL"
