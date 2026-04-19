#!/usr/bin/env bash
# test-workflows.sh — End-to-end smoke test for orchestrator workflows
#
# Usage:
#   ./scripts/test-workflows.sh <firebase-id-token>
#
# To get a Firebase ID token:
#   1. Sign in to the LUMARA app and extract it from DevTools / network tab, OR
#   2. Use the Firebase Auth REST API:
#      curl -s 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDL9V3qIyG4fDqnYDEazw9buUIsKO2keZo' \
#        -H 'Content-Type: application/json' \
#        -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD","returnSecureToken":true}' \
#        | jq -r '.idToken'
#
# What this tests:
#   - Orchestrator receives the request and forwards auth to swarmspaceRouter
#   - swarmspaceRouter validates the Firebase ID token (onCall v2 protocol)
#   - Plugins execute and return results through the chain
#
# Tested workflows (community launch gate — all 3 must pass):
#   1. /research   — brave-search + wikipedia + semantic-scholar → gemini-flash synthesis
#   2. /news-brief — news + hackernews + brave-search → gemini-flash brief
#   3. /competitor — brave-search + news + hackernews → gemini-flash analysis

set -euo pipefail

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <firebase-id-token>"
  echo ""
  echo "Get a token via Firebase Auth REST API:"
  echo "  curl -s 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDL9V3qIyG4fDqnYDEazw9buUIsKO2keZo' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\",\"returnSecureToken\":true}' \\"
  echo "    | jq -r '.idToken'"
  exit 1
fi

ORCHESTRATOR="https://swarmspace-orchestrator.orbitalai.workers.dev"
PASS=0
FAIL=0

# Helper: run a single workflow test
test_workflow() {
  local route="$1"
  local body="$2"
  local label="$3"

  echo "──────────────────────────────────────────"
  echo "TEST: $label ($route)"
  echo "──────────────────────────────────────────"

  HTTP_CODE=$(curl -s -o /tmp/swarm_test_response.json -w "%{http_code}" \
    -X POST "${ORCHESTRATOR}${route}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "$body" \
    --max-time 60)

  RESPONSE=$(cat /tmp/swarm_test_response.json 2>/dev/null || echo "(no response body)")

  echo "  HTTP: $HTTP_CODE"

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  STATUS: PASS"
    echo "  Response (first 500 chars):"
    echo "  ${RESPONSE:0:500}"
    PASS=$((PASS + 1))
  else
    echo "  STATUS: FAIL"
    echo "  Response: $RESPONSE"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  SwarmSpace Orchestrator Workflow Tests  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Orchestrator: $ORCHESTRATOR"
echo "Token: ${TOKEN:0:20}..."
echo ""

# ── Test 1: /research ──
test_workflow "/research" \
  '{"query":"transformer architecture"}' \
  "Research workflow (brave-search + wikipedia + semantic-scholar + gemini-flash)"

# ── Test 2: /competitor ──
test_workflow "/competitor" \
  '{"query":"Notion productivity tools"}' \
  "Competitor analysis (brave-search + news + hackernews + gemini-flash)"

# ── Test 3: /news-brief ──
test_workflow "/news-brief" \
  '{"query":"AI developer tools"}' \
  "News briefing (news + hackernews + brave-search + gemini-flash)"

# ── Summary ──
echo "══════════════════════════════════════════"
echo "RESULTS: $PASS passed, $FAIL failed (of 3)"
echo "══════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Troubleshooting:"
  echo "  - 401: Token expired or invalid. Get a fresh token."
  echo "  - 500: Plugin or synthesis error. Check Firebase logs:"
  echo "         firebase functions:log --only swarmspace-swarmspaceRouter"
  echo "  - Timeout: Workflow chains can take 30-60s. Try again."
  exit 1
fi
