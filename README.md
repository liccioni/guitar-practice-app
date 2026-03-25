# Fretline

Mobile guitar practice app (Expo + React Native + TypeScript).

## Stable Baseline
- Stable tag: `stable-2026-03-10-stitch-flow-batchc-green`
- Stable commit: `2a09696`
- CI is intentionally manual-only (`workflow_dispatch`) due to Actions credit limits.

## Quick Start
```bash
npm ci
npm run check
npm run ios:local
```

## Stitch Parity Gate
```bash
npm run parity:stitch
```

## Release Screenshots
```bash
npm run screenshots:release:ios
```

Pipeline doc:
- `docs/RELEASE_SCREENSHOT_PIPELINE.md`

## Maestro iOS Smoke
Install Maestro once:

```bash
npm run e2e:maestro:install
```

Prepare the simulator build and run the 3 core smoke flows:

```bash
npm run e2e:maestro:ios
```

Run only the flows after the app is already installed:

```bash
npm run e2e:maestro:test:ios
```

Safe fast rerun after a fresh native prepare on the current branch:

```bash
npm run e2e:maestro:rerun:ios
```

Use `e2e:maestro:ios` when native dependencies, Expo modules, prebuild output, or install state may have changed. Use `e2e:maestro:rerun:ios` only after a successful fresh prepare on the same native state.

Migration notes and Detox overlap:
- `docs/MAESTRO_MIGRATION.md`

## Core Docs
- Spec: `docs/SPEC.md`
- Runbook: `docs/PROJECT_RUNBOOK.md`
- Release captain checklist: `docs/RELEASE_CAPTAIN_CHECKLIST.md`
- Device QA checklist: `docs/DEVICE_QA_CHECKLIST.md`
- Release notes: `docs/RELEASE_NOTES.md`
- Release configuration: `docs/RELEASE_CONFIGURATION.md`
- Release screenshot pipeline: `docs/RELEASE_SCREENSHOT_PIPELINE.md`
- Architecture boundaries: `docs/ARCHITECTURE_BOUNDARIES.md`
- Analytics hook map: `docs/ANALYTICS_HOOK_MAP.md`
- Stitch design alignment: `docs/STITCH_FLOW_FEATURE_PLAN.md`
- Stitch parity gate: `docs/STITCH_PARITY.md`
- Visual snapshot names: `docs/VISUAL_SNAPSHOT_MANIFEST.md`
- Bug log: `docs/BUG_REPORTS.md`
- gh-pages deploy: `docs/GH_PAGES_RUNBOOK.md`
