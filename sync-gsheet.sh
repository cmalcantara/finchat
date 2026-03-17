#!/bin/bash
# Sync unsynced transactions to Google Sheets.
# Checks pending count first — skips the POST entirely if nothing needs syncing.

PORT="${PORT:-3000}"
BASE="http://localhost:${PORT}"

# Check pending count
RESULT=$(curl -sf "${BASE}/api/gsheet-sync" 2>/dev/null)
if [ -z "$RESULT" ]; then
  # Server unreachable — skip silently
  exit 0
fi

# No-op if pending is 0
if echo "$RESULT" | grep -q '"pending":0'; then
  exit 0
fi

# Pending rows exist — trigger sync and log the result
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Syncing..." >> /tmp/finchat-sync.log
curl -s -X POST "${BASE}/api/gsheet-sync" >> /tmp/finchat-sync.log 2>&1
echo "" >> /tmp/finchat-sync.log
