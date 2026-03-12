#!/usr/bin/env bash
set -euo pipefail

if command -v maestro >/dev/null 2>&1; then
  exit 0
fi

if [[ -x "$HOME/.maestro/bin/maestro" ]]; then
  exit 0
fi

curl -Ls https://get.maestro.mobile.dev | bash
