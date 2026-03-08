# Fretline UX/UI Implementation Plan (No Regression)

## Batch 1: Token + Shared Components
- Extract and centralize tokens from `App.tsx` into reusable constants.
- Introduce shared primitives for button/card/chip/text styles.
- Keep current visuals functionally equivalent.
- Verify: `npm run check` + iOS builder smoke.

## Batch 2: Dashboard Hierarchy Upgrade
- Strengthen single primary CTA (`Start Practice`).
- Reduce card density and improve section rhythm.
- Preserve all existing actions and testIDs.
- Verify: `npm run check` + `e2e/home-scroll.e2e.js`.

## Batch 3: Session Builder Tactile Flow
- Apply session-builder override rules.
- Ensure drill title readability under long names.
- Maintain reorder/remove behavior and tests.
- Verify: `npm run check` + `e2e/builder-smoke.e2e.js`.

## Batch 4: Practice Immersion
- Improve timer dominance and metronome control strip clarity.
- Add subtle reward/transition motion with reduced-motion fallback.
- Verify: `npm run check` + `e2e/visual-states.e2e.js`.

## Batch 5: Reward Moments
- Improve drill-complete and session-complete visual feedback.
- Maintain XP/streak logic untouched.
- Verify: `npm run check` + visual edge suite.

## Exit Criteria
- Unit/integration and required e2e suites green.
- No regressions on iOS/Android smoke checks.
- Docs updated when screen contracts change.
