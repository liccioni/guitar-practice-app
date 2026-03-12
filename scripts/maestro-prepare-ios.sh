#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1

SIMULATOR_NAME="${MAESTRO_DEVICE:-${DETOX_DEVICE:-iPhone 16e}}"
APP_PATH="ios/build/Build/Products/Release-iphonesimulator/GuitarPractice.app"
APP_ID="net.liccioni.guitarpractice"

if [[ ! -x "$HOME/.maestro/bin/maestro" ]] && ! command -v maestro >/dev/null 2>&1; then
  bash scripts/maestro-install.sh
fi

if [[ ! -d ios ]]; then
  npm run e2e:prebuild:ios
fi

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

echo "Prepared Maestro iOS app on simulator $SIMULATOR_NAME ($UDID)."
