#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install frontend dependencies (lint + build)
cd frontend-v2
npm install
cd ..

# Install backend dependencies (bcrypt needs native build)
cd wankr-backend
npm install
cd ..
