# Acceptance Criteria Audit Checklist

This mirrors `docs/ACCEPTANCE_CRITERIA.md`.

## Core Behavior
- [x] 1. Session template CRUD works with one or more segments.
- [x] 2. Validation enforces duration 1-30, BPM 40-240, total >= 5 minutes.
- [x] 3. Guided runtime includes timers and metronome controls.
- [x] 4. Pause/resume/skip/complete controls work correctly.
- [x] 5. Completed sessions are stored and visible with accurate minutes.
- [x] 6. Dashboard shows daily goal progress and streak.
- [x] 7. Daily reminder settings and local notification toggles work.
- [ ] 8. App is installable on physical iOS and Android devices via beta channels.
- [x] 9. Home dashboard has level/XP/streak/goal + primary Start Practice CTA.
- [x] 10. Builder uses draggable drill cards and add-drill FAB.
- [x] 11. Active screen uses large timer + circular progress ring + pause/skip.
- [x] 12. Completion screen shows XP gain, streak confirmation, badges, and level-up state.

## Non-Functional Requirements
- [x] 1. TDD workflow followed.
- [x] 2. No TypeScript/lint errors in CI.
- [ ] 3. Core domain coverage >= 80% with exclusions documented.
- [ ] 4. Core controls respond within performance target.
- [x] 5. MVP features work offline.
- [x] 6. App IDs configured as `net.liccioni.guitarpractice`.
- [x] 7. EAS build profiles include development/preview/production.
- [x] 8. UI is dark-mode only with `#121212` base background.
- [x] 9. Primary control touch targets are >=44px.
- [x] 10. Core transitions/animations target ~200ms.

## Edge Cases
- [x] 1. Invalid duration/BPM blocks save with actionable messaging.
- [ ] 2. Background/resume keeps active session timing correct.
- [x] 3. Skipped segments do not inflate completed minutes.
- [x] 4. Midnight boundary uses local timezone for streak logic.
- [x] 5. Empty history state has clear guidance.
- [ ] 6. Signing/build misconfiguration is caught before submission.
- [x] 7. Empty builder/runtime states provide clear next actions.

## Tests
- [ ] 1. Unit tests per production class.
- [x] 2. Full integration flow test (create -> run -> history/goal update).
- [ ] 3. Canonical SPEC examples are covered by tests.
- [x] 4. Dedicated suites exist for validation/runtime transitions/streak rules.
- [ ] 5. Physical-device smoke tests pass on iPhone and Android.
- [ ] 6. TestFlight internal and Play internal builds are published and installable.
