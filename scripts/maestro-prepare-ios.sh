#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1

SIMULATOR_NAME="${MAESTRO_DEVICE:-${DETOX_DEVICE:-iPhone 16e}}"
APP_ID="net.liccioni.guitarpractice"
WORKSPACE_PATH="${WORKSPACE_PATH:-$(find ios -maxdepth 1 -name '*.xcworkspace' | head -n 1)}"
APP_NAME="${APP_NAME:-}"
PREPARE_STATE_PATH="${MAESTRO_PREPARE_STATE_PATH:-artifacts/maestro/ios-prepare-state.json}"

if [[ -z "$WORKSPACE_PATH" ]]; then
  echo "Could not find an iOS workspace under ios/" >&2
  exit 1
fi

if [[ -z "$APP_NAME" ]]; then
  APP_NAME="$(basename "$WORKSPACE_PATH" .xcworkspace)"
fi

APP_PATH="ios/build/Build/Products/Release-iphonesimulator/${APP_NAME}.app"

if [[ ! -x "$HOME/.maestro/bin/maestro" ]] && ! command -v maestro >/dev/null 2>&1; then
  bash scripts/maestro-install.sh
fi

npm run e2e:prebuild:ios

npm run e2e:patch:ios
bash scripts/detox-build-ios.sh

UDID="$(xcrun simctl list devices available | awk -F '[()]' -v device="$SIMULATOR_NAME" '$0 ~ device { print $2; exit }')"
if [[ -z "$UDID" ]]; then
  echo "Could not find available iOS simulator named: $SIMULATOR_NAME" >&2
  exit 1
fi

open -a Simulator --args -CurrentDeviceUDID "$UDID" >/dev/null 2>&1 || true
xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP_PATH"
xcrun simctl terminate "$UDID" "$APP_ID" >/dev/null 2>&1 || true

mkdir -p "$(dirname "$PREPARE_STATE_PATH")"
cat >"$PREPARE_STATE_PATH" <<EOF
{
  "appId": "$APP_ID",
  "appPath": "$APP_PATH",
  "gitHead": "$(git rev-parse HEAD)",
  "simulatorName": "$SIMULATOR_NAME",
  "udid": "$UDID"
}
EOF

echo "Prepared Maestro iOS app on simulator $SIMULATOR_NAME ($UDID)."
