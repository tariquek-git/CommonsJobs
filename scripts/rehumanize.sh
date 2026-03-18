#!/bin/bash
# Re-humanize all active jobs with the latest AI prompt (v8-two-step)
# Usage:
#   1. Login to admin panel at https://www.fintechcommons.com/admin
#   2. Open browser DevTools → Application → Local Storage
#   3. Copy the 'fc_admin_token' value
#   4. Run: ADMIN_TOKEN="your_token_here" bash scripts/rehumanize.sh
#
# Optional: BATCH_SIZE=10 ADMIN_TOKEN="..." bash scripts/rehumanize.sh

set -e

BASE_URL="${BASE_URL:-https://www.fintechcommons.com}"
BATCH_SIZE="${BATCH_SIZE:-10}"
OFFSET="${OFFSET:-0}"
DRY_RUN="${DRY_RUN:-false}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: Set ADMIN_TOKEN env var (get it from browser Local Storage → fc_admin_token)"
  exit 1
fi

echo "🔄 Re-humanizing jobs with v8-two-step prompt"
echo "   Base URL: $BASE_URL"
echo "   Batch size: $BATCH_SIZE"
echo "   Starting offset: $OFFSET"
echo "   Dry run: $DRY_RUN"
echo ""

TOTAL_UPDATED=0
TOTAL_PROCESSED=0

while true; do
  echo "── Batch: offset=$OFFSET, limit=$BATCH_SIZE ──"

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/api/admin/rehumanize-all?limit=$BATCH_SIZE&offset=$OFFSET&dry_run=$DRY_RUN" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ HTTP $HTTP_CODE"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    exit 1
  fi

  PROCESSED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['processed'])")
  UPDATED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['summary']['updated'])" 2>/dev/null || echo "0")

  echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('results', []):
    status = r['status']
    emoji = '✅' if status == 'updated' else '⏭️' if status == 'no_changes' else '🔍' if status == 'dry_run' else '❌'
    print(f\"  {emoji} {r['title'][:50]:50s} → {status}\")
print(f\"  Summary: {data.get('summary', {})}\")" 2>/dev/null

  TOTAL_UPDATED=$((TOTAL_UPDATED + UPDATED))
  TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))

  if [ "$PROCESSED" -eq 0 ]; then
    echo ""
    echo "✅ Done! Processed $TOTAL_PROCESSED jobs total, $TOTAL_UPDATED updated."
    break
  fi

  OFFSET=$((OFFSET + BATCH_SIZE))
  echo ""

  # Small delay between batches to be nice to the API
  sleep 2
done
