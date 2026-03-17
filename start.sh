#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

PORT="${PORT:-3000}"
export PORT

echo "Building FinChat..."
npm run build

echo "Starting FinChat on port $PORT..."
exec npm start -- -p "$PORT"
