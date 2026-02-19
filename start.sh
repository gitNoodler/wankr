#!/bin/sh
set -e
# Build frontend then run backend (for Railway/Railpack when Dockerfile not used)
cd frontend && npm ci && npm run build
cd ../wankr-backend && npm install --omit=dev && exec node server.js
