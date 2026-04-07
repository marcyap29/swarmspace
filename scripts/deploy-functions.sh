#!/usr/bin/env bash
# Build and deploy Firebase Cloud Functions (includes proxyGemini).
# Run from repo root: ./scripts/deploy-functions.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "Building functions..."
cd functions
npm run build
cd ..

echo "Deploying functions..."
# Default 10s discovery often fails on large graphs or slower machines; override with FUNCTIONS_DISCOVERY_TIMEOUT.
export FUNCTIONS_DISCOVERY_TIMEOUT="${FUNCTIONS_DISCOVERY_TIMEOUT:-30}"
firebase deploy --only functions

echo "Done."
