#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-17.0}"

echo "[force-ios-target] Target iOS deployment: ${TARGET}"

if [[ -f ios/Podfile ]]; then
  perl -0pi -e "s/platform :ios, '\\d+(?:\\.\\d+)?'/platform :ios, '${TARGET}'/g" ios/Podfile
  echo "[force-ios-target] Patched ios/Podfile"
else
  echo "[force-ios-target] Skipped ios/Podfile (not found)"
fi

if [[ -f ios/GuitarPractice.xcodeproj/project.pbxproj ]]; then
  perl -0pi -e "s/IPHONEOS_DEPLOYMENT_TARGET = \\d+(?:\\.\\d+)?;/IPHONEOS_DEPLOYMENT_TARGET = ${TARGET};/g" ios/GuitarPractice.xcodeproj/project.pbxproj
  echo "[force-ios-target] Patched ios/GuitarPractice.xcodeproj/project.pbxproj"
else
  echo "[force-ios-target] Skipped ios/GuitarPractice.xcodeproj/project.pbxproj (not found)"
fi

if [[ -f ios/Pods/Pods.xcodeproj/project.pbxproj ]]; then
  perl -0pi -e "s/IPHONEOS_DEPLOYMENT_TARGET = \\d+(?:\\.\\d+)?;/IPHONEOS_DEPLOYMENT_TARGET = ${TARGET};/g" ios/Pods/Pods.xcodeproj/project.pbxproj
  echo "[force-ios-target] Patched ios/Pods/Pods.xcodeproj/project.pbxproj"
else
  echo "[force-ios-target] Skipped ios/Pods/Pods.xcodeproj/project.pbxproj (not found)"
fi

if [[ -f ios/GuitarPractice.xcodeproj/project.pbxproj ]]; then
  grep -n "IPHONEOS_DEPLOYMENT_TARGET" ios/GuitarPractice.xcodeproj/project.pbxproj | head -n 5
fi
