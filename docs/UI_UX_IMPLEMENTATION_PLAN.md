# Fretline UX/UI Implementation Plan (Stitch Alignment, No Regression)

## Source Of Truth
- Imported designs: `docs/design-import/stitch/stitch/*`
- Feature parity tracker: `docs/STITCH_FLOW_FEATURE_PLAN.md`

## Completed Batches
1. Batch A
- Stitch token direction and shared visual primitives established.
- Home + Builder hierarchy refresh landed.

2. Batch B
- Practice screen controls and completion summary updates landed.
- Share action stub added (no external service dependency).

3. Batch C
- Songs & Library screen and primary actions landed.
- Progress milestone/skills lane direction integrated into app flow.

## Remaining Batches
1. Batch D (Parity Hardening)
- Add/expand visual parity checks against Stitch screen references.
- Verify no layout regressions on long content and small devices.

2. Batch E (Polish)
- Tighten microcopy consistency across all Stitch-aligned screens.
- Final spacing/typography cleanup pass without changing behavior.

## Regression Gate For Every Batch
- `npm run check`
- `npm run e2e:detox:test:ios -- e2e/onboarding-smoke.e2e.js`
- `npm run e2e:detox:test:ios -- e2e/builder-smoke.e2e.js`
- `npm run e2e:android:onboarding`
- `npm run e2e:android:smoke`

## Exit Criteria
- Stitch source screens are represented in app IA and core user journey.
- iOS and Android smoke gates remain green.
- Docs and runbooks remain synchronized with the active stable tag.
