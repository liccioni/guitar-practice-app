# Project Runbook (Rebuild From Scratch)

This runbook is designed to reproduce the project up to the exact stable baseline.

## 1. Target Baseline
- Stable tag: `stable-2026-03-04-ci-green`
- Stable commit: `fbca806`
- Canonical repo: `https://github.com/liccioni/guitar-practice-app`

## 2. Prerequisites
1. Node.js 20.x and npm.
2. Xcode + iOS Simulator (for local iOS and Detox).
3. CocoaPods (`sudo gem install cocoapods -N`).
4. Homebrew package for Detox simulator utility:
```bash
brew tap wix/brew
brew install applesimutils
```

## 3. Fresh Clone to Stable State
```bash
git clone git@github.com:liccioni/guitar-practice-app.git
cd guitar-practice-app
git fetch --tags
git checkout stable-2026-03-04-ci-green
npm ci
```

## 4. Verify Baseline Locally
1. Quality gate:
```bash
npm run check
```
Expected: lint + typecheck + coverage pass.

2. iOS e2e validation:
```bash
npm run e2e:detox:build:ios
npm run e2e:detox:test:ios
```
Expected: all `Session builder e2e` tests pass.

## 5. Run App Locally
```bash
npm run ios:local
```
Alternative:
```bash
npm run start
```

## 5.1 Distribution Constraints
- Android internal distribution is available through EAS preview builds.
- iOS internal/store distribution requires a paid Apple Developer team.
- If Apple enrollment is not active, continue iOS via simulator/local QA only.

## 6. CI Design (Important for Reproducibility)
The repo intentionally ignores generated native folders in git (`/ios`, `/android`).

CI therefore must always generate and normalize native iOS files during the workflow:
1. `npm run e2e:prebuild:ios`
2. `bash scripts/force-ios-deployment-target.sh 17.0` (pre-pods)
3. `pod install --repo-update`
4. `bash scripts/force-ios-deployment-target.sh 17.0` (post-pods)
5. `npm run e2e:detox:build:ios`
6. `npx detox clean-framework-cache && npx detox build-framework-cache`
7. `npm run e2e:detox:test:ios`

This flow is implemented in `.github/workflows/ci.yml`.

## 7. Why These Hardening Steps Exist
1. Path safety
- Build scripts patch generated Xcode project scripts to handle spaces in workspace paths.
- Script: `scripts/patch-ios-project-scripts.js`

2. Deployment/SDK drift
- Expo prebuild/pods can drift SDK/deployment values.
- Script `scripts/force-ios-deployment-target.sh` forces:
  - `IPHONEOS_DEPLOYMENT_TARGET = 17.0`
  - generic `SDKROOT` values (`iphonesimulator` / `iphoneos`)

3. Detox synchronization
- App has frequent timers/animations.
- E2E setup disables Detox synchronization per test launch for stability.
- File: `e2e/init.js`

## 8. Test Surfaces and Expected Results
1. Unit + integration
- 50 tests expected passing at baseline.

2. Detox iOS
- `e2e/builder-smoke.e2e.js` expects 4 passing tests:
  - add drill
  - remove drill
  - start session
  - complete session by skip

## 9. Recovery Procedures
1. If Detox reports framework cache validation errors:
```bash
npx detox clean-framework-cache
npx detox build-framework-cache
```

2. If iOS workspace is missing:
```bash
npm run e2e:prebuild:ios
```

3. If iOS SDK/deployment mismatch appears in CI:
- Confirm `EXPO_IOS_DEPLOYMENT_TARGET=17.0` in workflow.
- Ensure `scripts/force-ios-deployment-target.sh 17.0` is run pre/post pods.

4. If screen navigation shows flicker/flash:
- Check `App.tsx` global fade transition.
- It must remain a soft fade-in (no `1 -> 0 -> 1` full fade-out sequence).
- Reference bug report: `docs/BUG_REPORTS.md` (`BR-2026-03-04-001`).

## 10. How to Mark a New Stable Baseline
1. Ensure local + CI are green.
2. Create and push annotated tag:
```bash
git tag -a stable-YYYY-MM-DD-<suffix> -m "Stable baseline"
git push origin stable-YYYY-MM-DD-<suffix>
```
3. Create GitHub release from tag.
