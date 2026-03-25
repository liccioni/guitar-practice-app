#!/usr/bin/env bash
set -euo pipefail

PREFERRED_JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"

if [[ -d "$PREFERRED_JAVA_HOME" ]]; then
  export JAVA_HOME="$PREFERRED_JAVA_HOME"
fi

if [[ -z "${ANDROID_HOME:-}" && -d "/opt/homebrew/share/android-commandlinetools" ]]; then
  export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
fi

if [[ -z "${ANDROID_SDK_ROOT:-}" && -n "${ANDROID_HOME:-}" ]]; then
  export ANDROID_SDK_ROOT="${ANDROID_HOME}"
fi

if [[ -n "${ANDROID_HOME:-}" ]]; then
  export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: bash scripts/with-android-env.sh <command> [args...]"
  exit 2
fi

exec "$@"
