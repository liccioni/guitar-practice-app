#!/usr/bin/env bash
set -euo pipefail

xcodebuild \
  -workspace ios/GuitarPractice.xcworkspace \
  -scheme GuitarPractice \
  -configuration Release \
  -sdk iphonesimulator \
  -derivedDataPath ios/build
