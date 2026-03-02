# SPEC Alignment Checklist

Purpose: track gaps between `docs/SPEC.md` and repository implementation.

## Decision
- Selected direction: **Option 1 - Local-first MVP**.

## Alignment Status
- `docs/SPEC.md` still reflects the correct target product strategy.
- Current implementation is partially aligned and currently diverges in user-facing flows:
  - Template CRUD flow is not available in the current UI.
  - Runtime metronome/BPM controls are not available in the current UI.
  - History/goal/reminder persistence is not fully represented in the current UI.

## Completed Through Phase 4
1. Foundation + test harness established.
2. Core domain modules and tests for templates/runtime/history/goals/metronome exist.
3. Gamified screen system implemented for Home, Builder, Active, and Complete views.
4. Build/test quality gate remains green.

## Remaining Work
1. Restore UI parity with SPEC for templates, metronome controls, and persisted progress flows.
2. Re-run acceptance audit and close failing criteria before beta onboarding.
3. Phase 5: Store onboarding and beta distribution (TestFlight + Play internal).
4. Phase 6: Production submission and launch.
