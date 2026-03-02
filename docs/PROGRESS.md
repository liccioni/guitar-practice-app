# Progress Checklist

This checklist mirrors `docs/PLAN.md`.

## Current Checkpoint (2026-03-02)
- Gamified UI shell is implemented.
- Core domain tests still pass.
- User-facing feature parity regressed in the UI for template CRUD, metronome, persisted history/goals, and reminders.

## Phase 0 — Foundation
- [x] 0.1 Initialize Expo React Native TypeScript app with lint/format/tests.
- [x] 0.2 Set up domain module boundaries (`sessions`, `exercises`, `history`, `goals`, `metronome`).
- [x] 0.3 Define local persistence abstraction and test doubles.
- [x] 0.4 Create baseline navigation shell.
- [x] 0.5 Add first TDD tests from `docs/FIRST_TESTS_CHECKLIST.md`.

## Phase 1 — Feature A
- [ ] 1.1 Implement template CRUD with segment list support.
- [ ] 1.2 Add validation rules for duration/BPM/minimum session length.
- [ ] 1.3 Implement exercise tagging and picker.
- [ ] 1.4 Persist templates locally and load at startup.

## Phase 2 — Feature B
- [ ] 2.1 Implement session runtime state machine.
- [x] 2.2 Add segment and total countdown timers.
- [ ] 2.3 Add metronome controls and runtime BPM adjustments.
- [x] 2.4 Implement pause/resume/skip/complete segment actions.
- [ ] 2.5 Persist completed session records.

## Phase 3 — Feature C
- [ ] 3.1 Build history list and summary metrics cards.
- [ ] 3.2 Implement daily goal settings and streak logic.
- [x] 3.3 Add dashboard progress widgets.
- [ ] 3.4 Implement optional local reminder notifications.

## Phase 4 — Hardening and Release
- [ ] 4.1 Complete accessibility pass.
- [ ] 4.2 Complete offline reliability and data migration pass.
- [ ] 4.3 Verify performance on target mid-tier device.
- [ ] 4.4 Prepare beta release candidate and release notes.

## Phase 5 — Store Onboarding and Beta Distribution
- [x] 5.1 Configure app IDs (`net.liccioni.guitarpractice`) for iOS/Android.
- [x] 5.2 Configure EAS build profiles (`development`, `preview`, `production`).
- [ ] 5.3 Set up App Store Connect app record.
- [ ] 5.4 Set up Play Console app record and internal testing track.
- [ ] 5.5 Publish TestFlight internal build and Play internal testing build.
- [ ] 5.6 Complete at least one beta feedback/fix cycle.

## Phase 6 — Production Submission
- [ ] 6.1 Finalize store listing assets and privacy/support links.
- [ ] 6.2 Submit production builds for iOS and Android.
- [ ] 6.3 Resolve review feedback/rejections.
- [ ] 6.4 Publish production release and tag release notes.
