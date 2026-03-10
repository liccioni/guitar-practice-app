# Guitar Practice App

Gamified mobile guitar practice coach built with Expo + React Native + TypeScript.

## Reproducibility Status
- Last audited app baseline: `a2867de`
- Bit-for-bit rebuild target: `git checkout a2867de`
- CI workflows are intentionally manual-only (`workflow_dispatch`) due to Actions credit constraints.
- Canonical rebuild guide: [docs/PROJECT_RUNBOOK.md](/Users/liccioni/CodexProjects/guitar practice app/docs/PROJECT_RUNBOOK.md)

## App Identity
- iOS bundle identifier: `net.liccioni.guitarpractice`
- Android package: `net.liccioni.guitarpractice`

## Quick Start
```bash
npm ci
npm run check
npm run ios:local
```

## Android Environment
`npm run android` and Android smoke scripts now auto-load local defaults via `scripts/with-android-env.sh`.
Manual exports are still supported if your SDK/JDK paths differ:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
```

## Test Commands
```bash
npm run test:coverage
npm run e2e:detox:build:ios
npm run e2e:detox:test:ios
npm run e2e:detox:test:ios:onboarding
npm run e2e:detox:test:ios -- e2e/visual-states.e2e.js
npm run e2e:detox:test:ios -- e2e/visual-edge-states.e2e.js
npm run e2e:android:onboarding
npm run e2e:android:smoke
npm run e2e:detox:visual:ios
npm run e2e:detox:visual:edge:ios
npm run stability:all
```

## Documentation
- Product + acceptance criteria: `docs/SPEC.md`
- Full rebuild runbook (from scratch): `docs/PROJECT_RUNBOOK.md`
- Latest app completion audit: `docs/APP_AUDIT_2026-03-10.md`
- Change history + stability markers: `docs/RELEASE_NOTES.md`
- Bug registry: `docs/BUG_REPORTS.md`
- Active release execution plan: `docs/RELEASE_PLAN.md`
- Next feature roadmap (variation + onboarding + website): `docs/NEXT_FEATURE_PLAN.md`
- UI/UX Pro Max integration workflow: `docs/UI_UX_PRO_MAX_INTEGRATION.md`
- UI redesign rollout plan (no-regression batches): `docs/UI_UX_IMPLEMENTATION_PLAN.md`
- Fretline design system source of truth: `docs/design-system/fretline/MASTER.md`
- Visual screenshot expectations: `docs/VISUAL_SNAPSHOT_MANIFEST.md`
- `gh-pages` website runbook (manual deploy): `docs/GH_PAGES_RUNBOOK.md`
