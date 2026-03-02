# Phase 4 Verification

## Scope Status
1. `npm run check` currently passes.
2. Gamified UI pass completed for Home, Builder, Active, and Complete screens.
3. Phase 4 is not releasable yet due feature parity regressions introduced during UI refactor.

## Open Regressions
1. Session template CRUD is not exposed in the current UI.
2. Runtime metronome controls and BPM adjustment are not exposed in the current UI.
3. Persisted history/goals/reminders are not wired through the current gamified UI flow.
4. Completion flow minute accounting currently risks inflation when drills are skipped.

## Exit Criteria Before Phase 5
1. Restore parity for SPEC sections on templates, metronome runtime, and history/goals/reminders.
2. Re-run acceptance audit and mark all Core Behavior items 1-7 as passing.
3. Complete physical-device smoke tests after parity restoration.
