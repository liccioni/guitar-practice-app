#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ANDROID_SDK_DEFAULT="/opt/homebrew/share/android-commandlinetools"
JAVA_HOME_DEFAULT="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
EMULATOR_BIN="$ANDROID_SDK_DEFAULT/emulator/emulator"

export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_DEFAULT}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
if [ -d "$JAVA_HOME_DEFAULT" ]; then
  export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
fi

ensure_android_device() {
  if adb devices | awk 'NR>1 && $2=="device" {found=1} END {exit found ? 0 : 1}'; then
    return
  fi

  if [ ! -x "$EMULATOR_BIN" ]; then
    echo "No Android device online and emulator binary not found at $EMULATOR_BIN"
    return 1
  fi

  local avd
  avd="$($EMULATOR_BIN -list-avds | head -n 1)"
  if [ -z "$avd" ]; then
    echo "No Android AVD available. Create one with avdmanager."
    return 1
  fi

  echo "Starting Android emulator: $avd"
  nohup "$EMULATOR_BIN" -avd "$avd" -no-snapshot-load -netdelay none -netspeed full >/tmp/android-emulator.log 2>&1 &

  for _ in {1..60}; do
    if adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q '^1$'; then
      echo "Android emulator booted."
      return
    fi
    sleep 5
  done

  echo "Android emulator did not boot in time. See /tmp/android-emulator.log"
  return 1
}

echo "== Quality gate =="
npm run check

echo "== iOS stability gate =="
npm run e2e:detox:build:ios
npm run e2e:detox:test:ios -- e2e/home-scroll.e2e.js
npm run e2e:detox:test:ios -- e2e/builder-smoke.e2e.js
npm run e2e:detox:test:ios -- e2e/visual-states.e2e.js
npm run e2e:detox:test:ios -- e2e/visual-edge-states.e2e.js

echo "== Android stability gate =="
ensure_android_device
npm run android
npm run e2e:android:regression:start-session
npm run e2e:android:smoke

echo "PASS: Cross-platform stability gate is green."
