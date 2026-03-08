# Project Runbook (Reproduce Current Main From Scratch)

This runbook reproduces the repository exactly as it exists on `origin/main` at the time you run it.
For a bit-for-bit reproduction of the audited state in this document, use commit `e7cfc3f`.

## 1. Host Requirements (macOS)
1. Xcode + iOS Simulator.
2. Node.js 20.x + npm.
3. CocoaPods.
4. Homebrew.
5. Java 21 (OpenJDK).
6. Android command-line SDK + emulator packages.

Install core tooling:
```bash
brew install node cocoapods openjdk@21 android-commandlinetools
brew tap wix/brew
brew install applesimutils
```

## 2. Required Environment Variables
Set these in every terminal used for Android/Expo/Gradle:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```

## 3. Android SDK/AVD Bootstrap (First-Time Only)
```bash
yes | sdkmanager --install "platform-tools" "emulator" "platforms;android-35" "build-tools;36.0.0" "system-images;android-35;google_apis;arm64-v8a"
echo "no" | avdmanager create avd -n Pixel_8_API_35 -k "system-images;android-35;google_apis;arm64-v8a" --device "pixel_8"
```

Verify:
```bash
/opt/homebrew/share/android-commandlinetools/emulator/emulator -list-avds
adb version
```

## 4. Clone And Sync
```bash
git clone git@github.com:liccioni/guitar-practice-app.git
cd guitar-practice-app
git checkout main
git pull --ff-only
# Optional exact-state pin (recommended for reproducibility audit):
git checkout e7cfc3f
git rev-parse --short HEAD
npm ci
```

## 5. Quality Gate (Required)
```bash
npm run check
```

Expected:
- eslint clean
- TypeScript clean
- Vitest passing with strict per-file/global 95% thresholds

## 6. iOS E2E Reproduction
Build once:
```bash
npm run e2e:detox:build:ios
```

Run suites:
```bash
npm run e2e:detox:test:ios -- e2e/home-scroll.e2e.js
npm run e2e:detox:test:ios -- e2e/builder-smoke.e2e.js
npm run e2e:detox:test:ios -- e2e/onboarding-smoke.e2e.js
npm run e2e:detox:test:ios -- e2e/visual-states.e2e.js
npm run e2e:detox:test:ios -- e2e/visual-edge-states.e2e.js
```

Notes:
- If Detox fails with bundle/startup drift after code changes, rebuild iOS binary first (`npm run e2e:detox:build:ios`).
- Visual artifact names are locked in `docs/VISUAL_SNAPSHOT_MANIFEST.md`.

## 7. Android Reproduction
Start emulator (if not running):
```bash
/opt/homebrew/share/android-commandlinetools/emulator/emulator -avd Pixel_8_API_35
```

In terminal A (keep running):
```bash
npm run android
```

In terminal B:
```bash
npm run e2e:android:regression:start-session
npm run e2e:android:onboarding
npm run e2e:android:smoke
```

## 8. Full Stability Gate (Local)
```bash
npm run stability:all
```

This command enforces:
- strict quality gate
- iOS Detox suite set
- Android smoke/regression

## 9. CI State
- `.github/workflows/ci.yml`: manual trigger only.
- `.github/workflows/detox-ios.yml`: manual trigger only.
- This is intentional while GitHub Actions credits are constrained.

## 10. Troubleshooting
1. `Unable to locate a Java Runtime`
- Ensure `JAVA_HOME` points to OpenJDK 21 as above.

2. `Failed to resolve Android SDK path` / `SDK location not found`
- Ensure `ANDROID_HOME` and `ANDROID_SDK_ROOT` are exported.

3. Android redbox: `Unable to load script`
- Start/keep Metro via `npm run android` before smoke commands.

4. Detox startup flake (`CFBundleIdentifier not found`)
- Re-run `npm run e2e:detox:build:ios` and then rerun test.

5. Missing simulator helper
- `applesimutils` is mandatory for Detox script wrappers.
