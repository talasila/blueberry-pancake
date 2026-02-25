#!/usr/bin/env bash
# Ensure all dependencies for `sam build` are available.
# Run from repo root: ./scripts/ensure-sam-deps.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MISSING=()

# Use Node from .nvmrc if nvm is available
use_nvm() {
  if command -v nvm &>/dev/null; then
    nvm use 2>/dev/null || nvm install
    return 0
  fi
  if [[ -f ~/.nvm/nvm.sh ]]; then
    . ~/.nvm/nvm.sh
    nvm use 2>/dev/null || nvm install
    return 0
  fi
  return 1
}

if [[ -f .nvmrc ]]; then
  use_nvm || true
fi

# Check Node.js
if ! command -v node &>/dev/null; then
  MISSING+=("Node.js (install via nvm: nvm install, or from https://nodejs.org)")
else
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_VER" -lt 22 ]]; then
    MISSING+=("Node.js 22+ (current: $(node -v); use .nvmrc: nvm use)")
  fi
fi

# Check npm
if ! command -v npm &>/dev/null; then
  MISSING+=("npm (comes with Node.js)")
fi

# Check Python 3.8–3.12 (SAM CLI requires this)
check_python() {
  for py in python3.12 python3.11 python3.10 python3.9 python3.8 python3 python; do
    if command -v "$py" &>/dev/null; then
      MAJOR=$("$py" -c "import sys; print(sys.version_info.major)" 2>/dev/null || echo 0)
      MINOR=$("$py" -c "import sys; print(sys.version_info.minor)" 2>/dev/null || echo 0)
      if [[ "$MAJOR" -eq 3 ]] && [[ "$MINOR" -ge 8 ]] && [[ "$MINOR" -le 12 ]]; then
        return 0
      fi
    fi
  done
  return 1
}
if ! check_python; then
  MISSING+=("Python 3.8–3.12 (Python 3.14 not supported; use pyenv: pyenv install 3.12 && pyenv local 3.12)")
fi

# Check SAM CLI
if ! command -v sam &>/dev/null; then
  MISSING+=("AWS SAM CLI (pip install aws-sam-cli)")
fi

# Install backend dependencies
if [[ -d backend ]] && command -v npm &>/dev/null; then
  (cd backend && npm install --no-audit --no-fund)
fi

# Report
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "Missing dependencies for sam build:"
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  exit 1
fi

echo "All SAM build dependencies OK."
echo "  node:   $(node -v)"
echo "  npm:    v$(npm -v)"
echo "  python: $(python3 --version 2>&1 || python --version 2>&1)"
echo "  sam:    $(sam --version 2>&1 | head -1)"
echo ""
echo "Run: sam build"
