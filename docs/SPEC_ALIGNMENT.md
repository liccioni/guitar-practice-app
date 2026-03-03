# SPEC Alignment Checklist

Purpose: track gaps between `docs/SPEC.md` and repository implementation.

## Decision
- Selected direction: **Option 1 - Local-first MVP**.

## Alignment Status
- `docs/SPEC.md` still reflects the correct target product strategy.
- Current implementation is partially aligned.
- Recent parity recovery restored major user-facing flows:
  - Template create/select/rename/save/delete in Builder.
  - Template duplicate action in Builder.
  - Runtime metronome toggle with BPM step controls.
  - History/goals/reminders persistence surfaced in UI.
- Remaining divergences:
  - Full drill validation UX (1-30 minutes, BPM 40-240 on user input) is not yet fully surfaced.

## Completed Through Phase 4
1. Foundation + test harness established.
2. Core domain modules and tests for templates/runtime/history/goals/metronome exist.
3. Gamified screen system implemented for Home, Builder, Active, and Complete views.
4. Parity recovery pass restored metronome, persisted history/goals/reminders, and skip-safe minute accounting.
5. Build/test quality gate remains green.

## Remaining Work
1. Close remaining Phase 1 UX polish around validation messaging depth and drill authoring ergonomics.
2. Re-run acceptance audit and close failing criteria before beta onboarding.
3. Phase 5: Store onboarding and beta distribution (TestFlight + Play internal).
4. Phase 6: Production submission and launch.
