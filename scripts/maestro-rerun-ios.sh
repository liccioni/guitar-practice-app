#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"

SIMULATOR_NAME="${MAESTRO_DEVICE:-${DETOX_DEVICE:-iPhone 16e}}"
APP_ID="net.liccioni.guitarpractice"
PREPARE_STATE_PATH="${MAESTRO_PREPARE_STATE_PATH:-artifacts/maestro/ios-prepare-state.json}"
CURRENT_HEAD="$(git rev-parse HEAD)"

UDID="$(xcrun simctl list devices available | awk -F '[()]' -v device="$SIMULATOR_NAME" '$0 ~ device { print $2; exit }')"
if [[ -z "$UDID" ]]; then
  echo "Could not find available iOS simulator named: $SIMULATOR_NAME" >&2
  exit 1
fi

bash scripts/recover-ios-simulator.sh "$SIMULATOR_NAME"

if [[ ! -f "$PREPARE_STATE_PATH" ]]; then
  cat >&2 <<EOF
No fresh Maestro iOS prepare record was found for this repo state.

Run one of these first:
- npm run e2e:maestro:prepare:ios
- npm run e2e:maestro:ios

The fast rerun path is only valid after a fresh prepare on the current commit.
Missing state file: $PREPARE_STATE_PATH
EOF
  exit 1
fi

PREPARED_HEAD="$(sed -n 's/.*"gitHead": "\(.*\)".*/\1/p' "$PREPARE_STATE_PATH")"
PREPARED_UDID="$(sed -n 's/.*"udid": "\(.*\)".*/\1/p' "$PREPARE_STATE_PATH")"

if [[ -z "$PREPARED_HEAD" || -z "$PREPARED_UDID" ]]; then
  cat >&2 <<EOF
The Maestro iOS prepare record is unreadable.

Run one of these first:
- npm run e2e:maestro:prepare:ios
- npm run e2e:maestro:ios

Prepare state file: $PREPARE_STATE_PATH
EOF
  exit 1
fi

if [[ "$PREPARED_HEAD" != "$CURRENT_HEAD" || "$PREPARED_UDID" != "$UDID" ]]; then
  cat >&2 <<EOF
The installed Maestro iOS app was not prepared for the current commit/simulator.

Current commit:  $CURRENT_HEAD
Prepared commit: $PREPARED_HEAD
Current UDID:    $UDID
Prepared UDID:   $PREPARED_UDID

Run one of these first:
- npm run e2e:maestro:prepare:ios
- npm run e2e:maestro:ios
EOF
  exit 1
fi

if ! xcrun simctl get_app_container "$UDID" "$APP_ID" >/dev/null 2>&1; then
  cat >&2 <<'EOF'
No prepared Maestro iOS app is installed on the selected simulator.

Run one of these first:
- npm run e2e:maestro:prepare:ios
- npm run e2e:maestro:ios

Use the fast rerun path only after a fresh prepare on the current native state.
EOF
  exit 1
fi

bash scripts/maestro-test-ios.sh
