#!/usr/bin/env bash
#
# Production Smoke Test Runner
#
# Runs the Playwright smoke test suite against a deployed environment.
# The test creates a temporary event, exercises the full lifecycle,
# and cleans up after itself.
#
# The OTP step will pause and prompt you to enter the code from your email.
#
# Usage:
#   ./scripts/smoketests.sh <APP_URL>
#   APP_URL=https://app.example.com ./scripts/smoketests.sh
#
# Environment variables:
#   APP_URL       (required) Deployed app URL
#   SMOKE_EMAIL   (required) Email address where you receive OTP codes
#
set -euo pipefail

APP_URL="${1:-${APP_URL:-https://blindwinetasting.party}}"
SMOKE_EMAIL="${SMOKE_EMAIL:-sreenivas.talasila@gmail.com}"

if [ -z "$APP_URL" ]; then
  echo "Error: APP_URL is required."
  echo ""
  echo "Usage:"
  echo "  SMOKE_EMAIL=you@example.com ./scripts/smoketests.sh https://your-app.example.com"
  echo ""
  echo "  or set both as environment variables:"
  echo "  APP_URL=https://your-app.example.com SMOKE_EMAIL=you@example.com ./scripts/smoketests.sh"
  exit 1
fi

if [ -z "$SMOKE_EMAIL" ]; then
  echo "Error: SMOKE_EMAIL is required (email address where you receive OTP codes)."
  echo ""
  echo "Usage:"
  echo "  SMOKE_EMAIL=you@example.com ./scripts/smoketests.sh $APP_URL"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

echo ""
echo "🔥 Production Smoke Test"
echo "   URL:   $APP_URL"
echo "   Email: $SMOKE_EMAIL"
echo ""

cd "$FRONTEND_DIR"

APP_URL="$APP_URL" SMOKE_EMAIL="$SMOKE_EMAIL" \
  npx playwright test \
    --config tests/smoke/smoke.config.js \
    --headed
