#!/usr/bin/env bash
# Blueberry Pancake - Production deployment script
# Usage: ./scripts/deploy-prod.sh
# Requires: JWT_SECRET, RESEND_API_KEY, ROOT_ADMIN_EMAILS env vars (or edit below)
#
# Custom domain (7155421.xyz): Set FRONTEND_DOMAIN and FRONTEND_DOMAIN_WWW.
# To use CloudFront URL only: FRONTEND_DOMAIN=d1hqcu1xzc62pt.cloudfront.net FRONTEND_DOMAIN_WWW="" ./scripts/deploy-prod.sh

set -e

ENV=prod

# Required - set via env or edit:
# JWT_SECRET, RESEND_API_KEY, ROOT_ADMIN_EMAILS, CSRF_SECRET, EMAIL_FROM_ADDRESS, FRONTEND_DOMAIN
# store secrets in AWS ssm and refer to them here
# Example for JWT_SECRET: aws ssm put-parameter --name "/blueberry-pancake/prod/jwt-secret" --value "<TBD>" --type SecureString 
JWT_SECRET="${JWT_SECRET:-$(aws ssm get-parameter --name /blueberry-pancake/prod/jwt-secret --with-decryption --query Parameter.Value --output text)}"
EMAIL_FROM_ADDRESS="${EMAIL_FROM_ADDRESS:-sreeni@7155421.xyz}"  # must be verified in Resend
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-blindwinetasting.party}"               # custom domain for CORS; use CloudFront domain if unset
FRONTEND_DOMAIN_WWW="${FRONTEND_DOMAIN_WWW:-www.blindwinetasting.party}"   # optional www variant; empty to exclude
CSRF_SECRET="${CSRF_SECRET:-$(openssl rand -base64 32)}"
TURNSTILE_SECRET_KEY="${TURNSTILE_SECRET_KEY:-$(aws ssm get-parameter --name /blueberry-pancake/prod/turnstile-secret --with-decryption --query Parameter.Value --output text)}"
TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY:-$(aws ssm get-parameter --name /blueberry-pancake/prod/turnstile-site-key --with-decryption --query Parameter.Value --output text)}"
RESEND_API_KEY="${RESEND_API_KEY:-$(aws ssm get-parameter --name /blueberry-pancake/prod/resend-api-key --with-decryption --query Parameter.Value --output text)}"
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
    FrontendDomain="$FRONTEND_DOMAIN" \
    FrontendDomainWww="$FRONTEND_DOMAIN_WWW" \
    TurnstileSecretKey="$TURNSTILE_SECRET_KEY"

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
echo "=== 4. Update backend CORS (add CloudFront domain) ==="
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-frontend-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
  --output text)
FRONTEND_DOMAIN_CLOUDFRONT=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|http://||' | sed 's|/.*||')

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
    FrontendDomain="$FRONTEND_DOMAIN" \
    FrontendDomainWww="$FRONTEND_DOMAIN_WWW" \
    FrontendDomainCloudFront="$FRONTEND_DOMAIN_CLOUDFRONT" \
    TurnstileSecretKey="$TURNSTILE_SECRET_KEY"

echo ""
echo "=== 5. Build and sync frontend assets ==="
API_URL=$(aws cloudformation describe-stacks \
  --stack-name blueberry-pancake-$ENV \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)
# Frontend uses relative /api paths — CloudFront proxies /api/* to API Gateway (same-origin cookies)
(cd frontend && VITE_TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY}" npm run build)

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
echo "Frontend URL (CloudFront): $FRONTEND_URL"
echo "Frontend URL (custom):     https://$FRONTEND_DOMAIN"
