#!/usr/bin/env bash
# Usage: bash scripts/sync-internal-token.sh
# Sets SWARMSPACE_INTERNAL_TOKEN in every plugin worker + the orchestrator.

set -e

read -r -s -p "Enter SWARMSPACE_INTERNAL_TOKEN value: " TOKEN
echo

WORKERS=(
  swarmspace-plugin-gemini-flash
  swarmspace-plugin-arxiv
  swarmspace-plugin-brave-search
  swarmspace-plugin-dictionary-api
  swarmspace-plugin-github-public
  swarmspace-plugin-hackernews
  swarmspace-plugin-jina-reader
  swarmspace-plugin-nominatim
  swarmspace-plugin-pubmed
  swarmspace-plugin-rest-countries
  swarmspace-orchestrator
)

for worker in "${WORKERS[@]}"; do
  echo "→ $worker"
  printf '%s' "$TOKEN" | npx wrangler secret put SWARMSPACE_INTERNAL_TOKEN --name "$worker"
done

echo ""
echo "✅ Done — all workers updated."
