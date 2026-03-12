# Maestro E2E Migration

## What Exists Today
Detox remains in the repository for broad native iOS regression coverage and screenshot capture. Maestro now covers the fastest smoke-path checks so local UI regression runs do not depend on the heavier Detox harness.

## Core Detox Flows Ported to Maestro
1. Home hub shows the primary practice entry points
   - Detox source: home loading coverage spread across `e2e/home-scroll.e2e.js` and `e2e/visual-states.e2e.js`
   - Maestro flow: `.maestro/smoke/home-hub.yaml`
2. Complete the starter questionnaire and reach the suggested builder session
   - Detox source: onboarding smoke intent from `e2e/onboarding-smoke.e2e.js`, adapted for the clean-launch state that now starts with an incomplete questionnaire
   - Maestro flow: `.maestro/smoke/onboarding-reset-to-builder.yaml`
3. Builder smoke starts and completes a session
   - Detox source: core smoke path inside `e2e/builder-smoke.e2e.js`
   - Maestro flow: `.maestro/smoke/builder-start-complete.yaml`

## Local Run
Install Maestro once:

```bash
npm run e2e:maestro:install
```

Prepare the iOS simulator app:

```bash
npm run e2e:maestro:prepare:ios
```

Run the smoke flows:

```bash
npm run e2e:maestro:test:ios
```

One-command prepare + run:

```bash
npm run e2e:maestro:ios
```

Environment notes:
- Default simulator: `iPhone 16e`
- Override simulator: `MAESTRO_DEVICE="iPhone 17 Pro" npm run e2e:maestro:ios`
- Maestro CLI expects Java. The repo scripts default `JAVA_HOME` to Homebrew OpenJDK 21 if it exists at `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.

## Manual CI Support
A manual-only GitHub Actions workflow is available in `.github/workflows/maestro-ios.yml`. It mirrors the repo policy of keeping automation disabled for push and pull_request events.

## Detox Coverage Now Redundant
No Detox file is fully safe to remove yet.

Partially replaced but not safe to remove yet:
- `e2e/home-scroll.e2e.js`
  - Maestro now checks the home hub entry points instead of the exact long-scroll behavior.
- `e2e/onboarding-smoke.e2e.js`
  - Maestro now covers the first-run questionnaire-to-builder smoke path instead of the older reset-from-profile path.
- `e2e/builder-smoke.e2e.js`
  - Maestro now covers the add/start/complete smoke path.
  - Detox still covers remove, reorder, and validation checks that do not yet have Maestro equivalents.

## Recommendation
Keep Detox for visual-state capture and the remaining builder-specific assertions. Use Maestro as the default local iOS smoke suite because it is lighter to run and easier to maintain for product-facing UI checks.
