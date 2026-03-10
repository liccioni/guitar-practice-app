# Stitch Flow Feature Plan (2026-03-10)

Source assets:
- `docs/design-import/stitch/stitch/main_practice_hub`
- `docs/design-import/stitch/stitch/songs_library`
- `docs/design-import/stitch/stitch/drill_builder`
- `docs/design-import/stitch/stitch/practice_session`
- `docs/design-import/stitch/stitch/session_summary`
- `docs/design-import/stitch/stitch/progress_dashboard`

## Newly Identified Feature Deltas
1. Songs & Library vertical:
- Search/filter songs
- Featured challenge card
- Add-to-routine and quick start actions per song
- Difficulty/lifecycle labels (`New`, `Mastered`)

2. Builder workflow enhancements:
- "Preview Routine" step before start
- Stronger chain summary framing ("Total Reward", "Estimated Time")
- Richer drill card composition

3. Practice-mode interaction deltas:
- Focus toggle state in header
- "Beat pulse locked" explicit control
- Expanded metronome rig grouping and copy

4. Session summary deltas:
- Relative performance deltas (`+15% from last session`)
- Explicit share action for achievements

5. Progress deltas:
- Skills mastered leveling lanes
- Upcoming milestone cards and unlock previews

## Delivery Plan
Batch A (current):
- Introduce Stitch-aligned design tokens.
- Refresh Home + Builder visual hierarchy only.
- Keep behavior and all existing testIDs unchanged.

Batch B:
- Practice screen + Summary visual/state updates.
- Add share-action stub (local callback, no external deps).

Batch C:
- Implement Songs & Library domain model + screen.
- Wire "Add to chain" and "Start now" into existing flow.

Batch D:
- Progress milestone/skills module parity.
- Add e2e coverage for new Songs/Library flow and milestone rendering.

## Regression Rules
- `npm run check` must stay green.
- iOS smoke suites (`onboarding-smoke`, `builder-smoke`) stay green.
- Android smoke suites (`e2e:android:onboarding`, `e2e:android:smoke`) stay green.
- Keep CI disabled (manual triggers only) per project constraint.
