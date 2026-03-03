#!/usr/bin/env bash
#
# Smoke Test Runner
#
# Runs the Playwright smoke test suite against a deployed (or local) environment.
# The test creates a temporary event, exercises the full lifecycle,
# and cleans up after itself.
#
# The OTP step will pause and prompt you to enter the code from your email.
# Tip: In local dev, use OTP 123456 (test bypass).
#
# Usage:
#   ./scripts/smoketests.sh                          # defaults to production URL
#   ./scripts/smoketests.sh http://localhost:3000     # local dev
#   ./scripts/smoketests.sh <APP_URL> <SMOKE_EMAIL>  # fully explicit
#
# Both arguments can also be set via environment variables:
#   APP_URL       Deployed app URL      (default: https://blindwinetasting.party)
#   SMOKE_EMAIL   Email for OTP codes   (default: sreenivas.talasila@gmail.com)
#
set -euo pipefail

APP_URL="${1:-${APP_URL:-https://blindwinetasting.party}}"
SMOKE_EMAIL="${2:-${SMOKE_EMAIL:-sreenivas.talasila@gmail.com}}"

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
