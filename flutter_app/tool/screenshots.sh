#!/usr/bin/env bash
# Captures marketing screenshots of every screen on an iOS simulator.
#   tool/screenshots.sh [simulator-name] [api-url]
# Needs a backend with a demo account (DEMO_EMAIL / DEMO_PASSWORD) and data.
set -euo pipefail
SIM="${1:-iPhone 17 Pro}"
API="${2:-http://127.0.0.1:5055}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/screenshots"
mkdir -p "$OUT"

UDID=$(xcrun simctl list devices available | grep -m1 "    $SIM (" | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
if ! xcrun simctl list devices | grep -q "$UDID) (Booted)"; then
  xcrun simctl boot "$UDID"
  # Wait for SpringBoard (bootstatus can hang on a first boot).
  for _ in $(seq 1 90); do xcrun simctl spawn "$UDID" launchctl print system 2>/dev/null | grep -q SpringBoard && break; sleep 2; done
fi
open -a Simulator
sleep 3
xcrun simctl status_bar "$UDID" override --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi

flutter test integration_test/screenshots_test.dart -d "$UDID" --dart-define=API_URL="$API" 2>&1 | while IFS= read -r line; do
  echo "$line"
  if [[ "$line" == *"SHOT:"* ]]; then
    name="${line##*SHOT:}"
    xcrun simctl io "$UDID" screenshot --type=png "$OUT/${name//[^a-z0-9-]/}.png" >/dev/null 2>&1 && echo ">> captured $name"
  fi
done
xcrun simctl status_bar "$UDID" clear
echo "Screenshots in $OUT"
