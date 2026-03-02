# Acceptance Criteria

## Core Behavior
1. User can create, edit, duplicate, and delete session templates with one or more segments.
2. Template validation enforces:
   - Segment duration between 1 and 30 minutes.
   - Segment BPM between 40 and 240.
   - Total session duration at least 5 minutes.
3. User can run a session with segment timer, total timer, and metronome controls.
4. Runtime supports pause, resume, skip segment, and mark segment complete.
5. Completed sessions are stored locally and visible in history with accurate total minutes.
6. Dashboard shows daily goal progress and streak based on local calendar day completion.
7. User can configure daily reminder time and enable/disable local reminder notifications.
8. App can be installed on physical iOS and Android devices using beta distribution channels.
9. Home dashboard shows level, XP progress, streak, goal progress, and primary `Start Practice` CTA.
10. Session Builder presents drills as reorderable visual cards with XP/duration/difficulty and an add-drill FAB.
11. Active Practice screen shows large timer, animated circular progress ring, drill title, XP reward, and pause/skip controls.
12. Session Complete screen shows session XP gain, streak confirmation, unlocked badges, and level-up state when applicable.

## Non‑Functional Requirements
1. TDD required.
2. No TypeScript errors and no lint errors in CI.
3. Coverage >= 80% on core domain modules with exclusions documented.
4. Core session controls respond in under 100 ms on target mid-tier devices.
5. App remains usable offline for all MVP features.
6. Mobile app IDs are correctly configured and stable:
   - iOS bundle ID: `net.liccioni.guitarpractice`
   - Android package: `net.liccioni.guitarpractice`
7. EAS build profiles exist for `development`, `preview`, and `production`.
8. Core app experience is dark-mode only with base background `#121212`.
9. Touch targets for primary controls are at least 44px high.
10. Primary state transitions and micro-animations target ~200ms interaction timing.

## Edge Cases
1. Invalid duration or BPM values block save and show actionable error messages.
2. App resume from background during an active session maintains correct timer state.
3. Skipped segments do not incorrectly inflate completed minutes.
4. Crossing midnight follows local timezone rules for streak updates.
5. Empty history state is rendered with clear guidance for first session creation.
6. Build/signing misconfiguration is detected before store submission.
7. Empty builder/runtime states present guided, non-admin-like messaging and clear next action.

## Tests
1. Unit tests per production class.
2. At least one integration test covering full flow: create template -> run session -> verify history/goal updates.
3. All canonical examples in SPEC are tested.
4. Validation, session runtime transitions, and streak calculations each have dedicated unit test suites.
5. Physical-device smoke tests pass on one iPhone and one Android device using beta builds.
6. TestFlight internal build and Play internal testing build are both published and installable.
