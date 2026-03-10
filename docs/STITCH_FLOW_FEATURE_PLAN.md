# Stitch Flow Feature Plan (2026-03-10)

Source assets:
- `docs/design-import/stitch/stitch/main_practice_hub`
- `docs/design-import/stitch/stitch/songs_library`
- `docs/design-import/stitch/stitch/drill_builder`
- `docs/design-import/stitch/stitch/practice_session`
- `docs/design-import/stitch/stitch/session_summary`
- `docs/design-import/stitch/stitch/progress_dashboard`

## Status Snapshot
- Reference stable tag: `stable-2026-03-10-stitch-flow-batchc-green`
- Reference commit: `2a09696`
- Goal: keep Stitch imports as visual/flow source of truth while preserving current functional stability gates.

## Screen Parity Map
1. Practice Hub (`main_practice_hub`)
- Status: Implemented
- Notes: hierarchy and CTA flow integrated; onboarding/goal modules preserved.

2. Songs & Library (`songs_library`)
- Status: Implemented
- Notes: search/filter, per-song actions, and song-state chips are present.

3. Build Your Chain (`drill_builder`)
- Status: Implemented with constraints
- Notes: inline autosave editing is active; reorder remains deterministic up/down (no drag).

4. Practice Mode (`practice_session`)
- Status: Implemented
- Notes: focus mode and beat-pulse lock controls integrated with existing timing/metronome logic.

5. Session Summary (`session_summary`)
- Status: Implemented
- Notes: reward emphasis + share action stub included.

6. Progress & Stats (`progress_dashboard`)
- Status: Implemented
- Notes: skill lanes and milestones integrated.

## Remaining Gaps (Non-Blocking)
1. Add dedicated Stitch parity visual assertions for Songs/Progress screens.
2. Final microcopy and spacing polish pass for full text consistency.
3. Optional tactile drag reorder in builder (future enhancement, not required for current stable flow).

## Delivery Tracking
1. Batch A: Completed
- Stitch tokens + Home/Builder hierarchy.

2. Batch B: Completed
- Practice + Session Summary.

3. Batch C: Completed
- Songs/Library + progress parity direction.

4. Batch D: Pending
- Expand parity-focused visual e2e coverage for Stitch-imported screens.

5. Batch E: Pending
- Final polish pass with no behavior changes.

## Regression Rules
- `npm run check` must stay green.
- iOS smoke suites (`onboarding-smoke`, `builder-smoke`) stay green.
- Android smoke suites (`e2e:android:onboarding`, `e2e:android:smoke`) stay green.
- Keep CI disabled (manual triggers only) per project constraint.
