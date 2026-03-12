#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1

SIMULATOR_NAME="${MAESTRO_DEVICE:-${DETOX_DEVICE:-iPhone 16e}}"
OUTPUT_DIR="${MAESTRO_OUTPUT_DIR:-artifacts/maestro}"

if [[ ! -x "$HOME/.maestro/bin/maestro" ]] && ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI is not installed. Run: npm run e2e:maestro:install" >&2
  exit 1
fi

UDID="$(xcrun simctl list devices available | awk -F '[()]' -v device="$SIMULATOR_NAME" '$0 ~ device { print $2; exit }')"
if [[ -z "$UDID" ]]; then
  echo "Could not find available iOS simulator named: $SIMULATOR_NAME" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
maestro test \
  --config .maestro/config.yaml \
  --device "$UDID" \
  --format junit \
  --output "$OUTPUT_DIR/maestro-report.xml" \
  --test-output-dir "$OUTPUT_DIR" \
  .maestro/smoke/*.yaml
