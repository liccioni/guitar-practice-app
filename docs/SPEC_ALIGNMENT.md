# SPEC Alignment Checklist

Purpose: track gaps between `docs/SPEC.md` and repository implementation.

## Decision
- Selected direction: **Option 1 - Local-first MVP**.

## Alignment Status
- `docs/SPEC.md` now matches the current project strategy:
  - Expo React Native mobile app
  - Offline-first, on-device persistence
  - Fully local data model and storage for MVP
  - Store-ready EAS distribution path
  - Runtime metronome controls and goal/streak dashboard

## Completed Through Phase 4
1. Foundation + test harness established.
2. Template CRUD, validation, tagging, and local persistence implemented.
3. Runtime state machine, timers, controls, and history persistence implemented.
4. Dashboard metrics, goals/streaks, and reminder scheduling implemented.
5. Hardening pass completed (accessibility labels, persistence versioning/migration, release checks).

## Remaining Work
1. Phase 5: Store onboarding and beta distribution (TestFlight + Play internal).
2. Phase 6: Production submission and launch.
