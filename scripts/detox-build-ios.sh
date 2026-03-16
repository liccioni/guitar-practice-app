#!/usr/bin/env bash
set -euo pipefail

export IPHONEOS_DEPLOYMENT_TARGET="${IPHONEOS_DEPLOYMENT_TARGET:-17.0}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-ios/build}"
CODEGEN_OUTPUT_ROOT="${CODEGEN_OUTPUT_ROOT:-ios}"
LOCK_DIR="${DERIVED_DATA_PATH}.lock"
LOCK_POLL_SECONDS="${LOCK_POLL_SECONDS:-2}"
LOCK_TIMEOUT_SECONDS="${LOCK_TIMEOUT_SECONDS:-300}"
WORKSPACE_PATH="${WORKSPACE_PATH:-$(find ios -maxdepth 1 -name '*.xcworkspace' | head -n 1)}"
SCHEME_NAME="${SCHEME_NAME:-}"

if [[ -z "$WORKSPACE_PATH" ]]; then
  echo "Could not find an iOS workspace under ios/" >&2
  exit 1
fi

if [[ -z "$SCHEME_NAME" ]]; then
  SCHEME_NAME="$(basename "$WORKSPACE_PATH" .xcworkspace)"
fi

acquire_lock() {
  local waited=0

  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    if [[ -f "$LOCK_DIR/pid" ]]; then
      local lock_pid
      lock_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
      if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
        rm -rf "$LOCK_DIR"
        continue
      fi
    fi

    if (( waited >= LOCK_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for iOS build lock at $LOCK_DIR" >&2
      exit 1
    fi

    sleep "$LOCK_POLL_SECONDS"
    waited=$((waited + LOCK_POLL_SECONDS))
  done

  echo "$$" >"$LOCK_DIR/pid"
}

release_lock() {
  rm -rf "$LOCK_DIR"
}

prepare_codegen_artifacts() {
  mkdir -p "$DERIVED_DATA_PATH"
  node node_modules/react-native/scripts/generate-codegen-artifacts.js \
    -p . \
    -t ios \
    -o "$CODEGEN_OUTPUT_ROOT"
}

acquire_lock
trap release_lock EXIT

prepare_codegen_artifacts

xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration Release \
  -sdk iphonesimulator \
  IPHONEOS_DEPLOYMENT_TARGET="$IPHONEOS_DEPLOYMENT_TARGET" \
  -derivedDataPath "$DERIVED_DATA_PATH"
