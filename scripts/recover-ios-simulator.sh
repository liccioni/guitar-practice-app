#!/usr/bin/env bash
set -euo pipefail

SIMULATOR_NAME="${1:-${MAESTRO_DEVICE:-${DETOX_DEVICE:-iPhone 16e}}}"

UDID="$(xcrun simctl list devices available | awk -F '[()]' -v device="$SIMULATOR_NAME" '$0 ~ device { print $2; exit }')"
if [[ -z "$UDID" ]]; then
  echo "Could not find available iOS simulator named: $SIMULATOR_NAME" >&2
  exit 1
fi

# SpringBoard crashes usually mean the existing Simulator session is unhealthy.
# Restart the target simulator cleanly before the next run instead of relying on
# the current process tree to recover itself.
xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true
killall Simulator >/dev/null 2>&1 || true

open -a Simulator --args -CurrentDeviceUDID "$UDID" >/dev/null 2>&1 || true
xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b

echo "Recovered iOS simulator $SIMULATOR_NAME ($UDID)."
