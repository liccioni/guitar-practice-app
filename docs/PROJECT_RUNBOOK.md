# Project Runbook (Minimal)

## 1. Prerequisites (macOS)
- Xcode + iOS Simulator
- Node 20+
- CocoaPods
- Java 21
- Android commandline tools + emulator

## 2. Clone + Install
```bash
git clone git@github.com:liccioni/guitar-practice-app.git
cd guitar-practice-app
git checkout stable-2026-03-10-stitch-flow-batchc-green
npm ci
```

## 3. Quality Gate
```bash
npm run check
```

## 4. iOS Run
```bash
npm run ios:local
```

## 5. Android Run
```bash
npm run android
```

## 6. Optional iOS E2E
```bash
npm run e2e:detox:build:ios
npm run e2e:detox:test:ios -- e2e/onboarding-smoke.e2e.js
npm run e2e:detox:test:ios -- e2e/builder-smoke.e2e.js
```

## 7. Optional Android Smoke
```bash
npm run e2e:android:onboarding
npm run e2e:android:smoke
```

## 8. Stitch Design Source
- `docs/design-import/stitch/stitch/main_practice_hub`
- `docs/design-import/stitch/stitch/songs_library`
- `docs/design-import/stitch/stitch/drill_builder`
- `docs/design-import/stitch/stitch/practice_session`
- `docs/design-import/stitch/stitch/session_summary`
- `docs/design-import/stitch/stitch/progress_dashboard`

## 9. Release QA Pass
- `docs/DEVICE_QA_CHECKLIST.md`

## 10. Release Configuration
- `docs/RELEASE_CONFIGURATION.md`

## 11. Release Captain Checklist
- `docs/RELEASE_CAPTAIN_CHECKLIST.md`
