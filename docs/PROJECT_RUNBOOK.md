# Project Runbook (Single Execution Guide)

This is the operational guide to rebuild the project from scratch and reach the current result.

## 1. Product Target
- App: mobile guitar practice coach.
- Platforms: iOS + Android (Expo React Native).
- Data model: local-first, offline-first, on-device persistence only.
- Visual direction: dark mode only (`#121212`), gamified UX, no admin/table UI patterns.
- Locked design tokens:
  - Background `#121212`, Surface `#1A1A1A`, Elevated `#222222`, Divider `#2A2A2A`
  - Primary Accent `#D97706`, Secondary Accent `#E6B980`, XP `#EAB308`
  - Primary Text `#F5F5F5`, Secondary Text `#B3B3B3`, Disabled `#6B7280`
- Accent usage is restricted to CTA, XP, progress ring, active drill, and streak indicator.
- Motion timing target is 180-220ms ease-in-out.

## 2. Current Delivered Scope
### Core flows implemented
1. Home dashboard
- Level, XP progress, streak, daily goal progress, achievement badges.
- Daily reminder toggle + reminder time save.

2. Session Builder
- Template create/select/rename/save/delete/duplicate.
- Drill cards with reorder controls (up/down).
- Drill add/remove.
- Drill edit form with domain validation (name, duration, BPM).
- Stable list rendering path is required (regression-safe fallback over drag-only behavior).

3. Active practice
- Countdown timer and session progress.
- Metronome on/off + BPM step controls (+/- 5).
- Pause/resume/skip.
- Skip-safe accounting (skipped drills do not count as completed minutes).

4. Session completion
- XP reward + level-up state.
- Streak confirmation.
- Badge updates.

5. Persistence
- Drills, templates, history, goal settings stored via local storage gateway.
- Versioned persistence envelope + migration handling.
- Load-time data sanitization removes malformed drills/history entries, repairs template drill references, and normalizes invalid goal settings.

## 3. Canonical Rules
1. Validation
- Drill name required.
- Drill duration 1-30 minutes.
- Drill BPM 40-240 when provided.
- Session template total duration >= 5 minutes.

2. Session accounting
- Completed minutes are only from completed drills.
- Skipped drills never increase completed minutes.
- Session is `completed=true` only when all drills are completed.

3. Goal/streak
- Goal progress from today minutes vs daily target.
- Streak based on local calendar days with practiced minutes > 0.

## 4. Architecture and File Map
### App shell
- `/Users/liccioni/CodexProjects/guitar practice app/App.tsx`

### Domain modules
- `/Users/liccioni/CodexProjects/guitar practice app/src/domain/exercises/drill.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/domain/sessions/sessionTemplate.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/domain/sessions/runtimeState.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/domain/metronome/metronome.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/domain/history/metrics.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/domain/goals/streak.ts`

### Application services
- `/Users/liccioni/CodexProjects/guitar practice app/src/application/practicePipeline.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/application/reminders.ts`

### Persistence
- `/Users/liccioni/CodexProjects/guitar practice app/src/persistence/LocalStorageGateway.ts`
- `/Users/liccioni/CodexProjects/guitar practice app/src/persistence/InMemoryPracticeRepository.ts`

## 5. Setup and Commands
1. Install
```bash
npm install
```

2. Run app
```bash
npm run ios:local
# or
npm run start
```

3. Quality gate (required before commit/release)
```bash
npm run check
```
This runs:
- lint
- typecheck
- test coverage gate

## 6. Testing and Coverage Policy
### Coverage gate is enforced in config
- `vitest` coverage provider: v8.
- Global thresholds:
  - lines >= 88
  - statements >= 80
  - functions >= 88
  - branches >= 60

### Test suites include
- domain validation + runtime + metrics + streak
- persistence migration + gateway behavior
- reminders behavior
- repository behavior
- end-to-end pipeline integration
- session builder UI-state interaction tests (add drill paths and template fallback/error handling)
- session builder reorder interaction tests (up/down and boundary behavior)

## 7. Acceptance Gate
### Functional acceptance
1. Template CRUD + duplicate works in Builder.
2. Validation errors are shown in-app (no uncaught runtime errors).
3. Active session supports timer, metronome, pause/resume/skip.
4. Completed sessions persist and metrics update on Home.
5. Reminder toggle/time saves and schedules locally.

### Quality acceptance
1. `npm run check` passes.
2. No red-screen/black-screen runtime crashes for invalid template/drill input or malformed persisted local state paths.

## 8. Remaining Work to Reach Store Submission
1. Validation UX polish and drill authoring ergonomics.
2. Physical device accessibility/performance verification.
3. Store pipeline execution:
- App Store Connect/TestFlight internal build.
- Play Console internal testing build.

## 9. Release Identity
- iOS bundle id: `net.liccioni.guitarpractice`
- Android package: `net.liccioni.guitarpractice`
- EAS profiles: `development`, `preview`, `production`
