# Release Notes

## Tags
- `v0.1.0-rc1` (pending tag)
  - Checkpoint build with gamified dark-mode UX across Home, Builder, Active, and Complete screens.
  - Added drag-reorder drill cards and animated progress/reward interactions.
  - Dependencies aligned for Reanimated/Worklets compatibility on Expo SDK 54.
  - Parity recovery updates:
    - Restored Builder template create/select/rename/save/delete flow.
    - Added Builder duplicate-template action.
    - Restored runtime metronome controls (toggle + BPM step controls + beat indicator).
    - Restored persisted history/goals/reminders wiring in UI.
    - Fixed skip path minute accounting to avoid counting skipped drills as completed.
    - Hardened active-session runtime path to guard invalid drill/progress values.
    - Added persistence load sanitization to prevent malformed local data from causing active-screen crashes.
    - Added sanitizer coverage tests; quality gate now passing with strict coverage thresholds.
    - Replaced unstable builder drag list path with stable list rendering and explicit up/down reorder controls.
    - Added builder interaction regression tests for add + reorder + template fallback/error paths.
  - Remaining gaps before release:
    - Full validation UX coverage for drill/session creation flows still incomplete.

## Notes
- Keep entries short and high‑signal.
