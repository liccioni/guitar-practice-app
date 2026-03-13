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

Migration notes and Detox overlap:
- `docs/MAESTRO_MIGRATION.md`

## Core Docs
- Spec: `docs/SPEC.md`
- Runbook: `docs/PROJECT_RUNBOOK.md`
- Release notes: `docs/RELEASE_NOTES.md`
- Architecture boundaries: `docs/ARCHITECTURE_BOUNDARIES.md`
- Stitch design alignment: `docs/STITCH_FLOW_FEATURE_PLAN.md`
- Stitch parity gate: `docs/STITCH_PARITY.md`
- Visual snapshot names: `docs/VISUAL_SNAPSHOT_MANIFEST.md`
- Bug log: `docs/BUG_REPORTS.md`
- gh-pages deploy: `docs/GH_PAGES_RUNBOOK.md`
