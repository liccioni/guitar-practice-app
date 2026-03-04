#!/usr/bin/env bash
set -euo pipefail

export IPHONEOS_DEPLOYMENT_TARGET="${IPHONEOS_DEPLOYMENT_TARGET:-17.0}"

xcodebuild \
  -workspace ios/GuitarPractice.xcworkspace \
  -scheme GuitarPractice \
  -configuration Release \
  -sdk iphonesimulator \
  IPHONEOS_DEPLOYMENT_TARGET="$IPHONEOS_DEPLOYMENT_TARGET" \
  -derivedDataPath ios/build
