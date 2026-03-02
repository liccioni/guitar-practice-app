# Implementation Plan

## Goal
Deliver an MVP mobile guitar practice app that lets users plan sessions, run guided practice with timers/metronome, and track daily progress and streaks.

## Execution Status
1. Completed: Phase 0 (foundation) and core domain/persistence modules from Phases 1-3.
2. In progress: UI parity recovery for Phases 1-3 features after gamified UX refactor.
3. Pending: Phase 5 (store onboarding and beta distribution) after parity recovery.
4. Pending: Phase 6 (production submission).
5. UX direction is locked to gamified coach experience (dark-mode only).

## Delivery Strategy
1. Work in small increments.
2. TDD‑first: tests before implementation.
3. Never loosen tests to accommodate broken behavior.
4. Update docs whenever behavior changes.
5. Use design patterns where they clarify structure.

## Phase 0 — Foundation
**Tasks**
1. Initialize Expo React Native TypeScript app with linting, formatting, and test harness.
2. Set up domain module boundaries (`sessions`, `exercises`, `history`, `goals`, `metronome`).
3. Define local persistence layer abstraction and in-memory test doubles.
4. Create baseline navigation shell (Onboarding, Home, Session Builder, Run Session, History, Goals).
5. Write first TDD tests from `FIRST_TESTS_CHECKLIST.md`.

**Done when**
- App boots to shell screens, CI checks run, and first unit + integration test scaffolding is green.

## Phase 1 — Feature A
**Feature**: Session Templates + Validation

**Tasks**
1. Implement create/edit/delete session templates with segment list support.
2. Add input validation for segment duration, BPM range, and minimum session duration.
3. Build exercise tagging and exercise picker for segments.
4. Persist templates locally and load them at app start.

**Tests**
1. Unit tests for validation rules and template domain operations.
2. UI integration test: create valid template and verify it appears on Home screen.
3. UI integration test: invalid values block save with correct error text.

**Done when**
- User can fully manage valid session templates and invalid templates are reliably prevented.

## Phase 2 — Feature B
**Feature**: Guided Session Runtime

**Tasks**
1. Implement session runtime state machine (`idle`, `running`, `paused`, `segmentComplete`, `finished`).
2. Add countdown timers for segment and total session.
3. Add metronome controls with runtime BPM adjustments.
4. Support pause/resume/skip segment/complete segment actions.
5. Persist completed session records with duration and per-segment metadata.

**Tests**
1. Unit tests for runtime state transitions and time accounting rules.
2. Unit tests for completed minutes counting logic.
3. Integration test: complete multi-segment session end-to-end and verify history record.

**Done when**
- Running a template produces a reliable guided experience and saves accurate completion data.

## Phase 3 — Feature C
**Feature**: History, Goals, and Streaks

**Tasks**
1. Build history list and summary cards (daily/weekly minutes, sessions completed, average BPM).
2. Implement daily goal settings and streak calculation logic.
3. Add dashboard widgets for progress against daily goal.
4. Add optional local reminder notification scheduling.

**Tests**
1. Unit tests for aggregation calculations and streak rules.
2. Unit tests for day-boundary behavior in local timezone.
3. Integration test: complete session, verify history and goal progress update immediately.

**Done when**
- Users can see meaningful progress trends and daily motivation indicators.

## Phase 4 — Hardening and Release
**Tasks**
1. Accessibility pass (touch targets, labels, screen reader basics, color contrast).
2. Offline reliability pass and data migration/versioning safeguards.
3. Performance verification on a representative mid-tier device.
4. Beta release candidate build and release notes preparation.
5. Gamified UX redesign pass across Home, Builder, Active, and Complete screens.

**Tests**
1. Regression suite across template management, runtime flow, and progress tracking.
2. Device smoke tests for iOS and Android.

**Done when**
- MVP release candidate passes acceptance criteria with no critical defects.

## Phase 5 — Store Onboarding and Beta Distribution
**Tasks**
1. Configure Expo app identity with:
   - `ios.bundleIdentifier = net.liccioni.guitarpractice`
   - `android.package = net.liccioni.guitarpractice`
2. Configure EAS project and build profiles (`development`, `preview`, `production`).
3. Set up Apple Developer and App Store Connect app record.
4. Set up Google Play Console app record and internal testing track.
5. Create preview builds and distribute:
   - iOS preview build to TestFlight internal testers.
   - Android preview build to Play internal testing.
6. Collect feedback from at least one complete test cycle and fix blocking issues.

**Tests**
1. Install smoke test on physical iPhone and Android device from beta channels.
2. Verify app startup, session run flow, and history update from beta builds (not only simulator/emulator).
3. Validate release signing configuration for both platforms.

**Done when**
- TestFlight and Play internal testing are active with installable builds and no P0/P1 beta blockers.

## Phase 6 — Production Submission
**Tasks**
1. Finalize store listing assets (name, descriptions, screenshots, category, support URL, privacy policy URL).
2. Prepare production EAS builds and submit:
   - iOS to App Store Connect for review.
   - Android to Google Play production (after required testing gates for account type).
3. Monitor review feedback and address rejections quickly.
4. Publish approved release and tag version in `docs/RELEASE_NOTES.md`.

**Tests**
1. Pre-submit release checklist is fully green.
2. Post-release smoke test confirms install and core session flow in production build.

**Done when**
- App is approved and publicly available in both Apple App Store and Google Play Store.
