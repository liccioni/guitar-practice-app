# Guitar Practice App Specification (Canonical)

This is the implementation contract for the current project state.

## 1. Product Scope
- Platform: Expo React Native app for iOS and Android.
- Architecture: local-only persistence (no backend).
- UX direction: dark-mode-only gamified coach experience.
- Domain/package identity:
  - iOS bundle id: `net.liccioni.guitarpractice`
  - Android package: `net.liccioni.guitarpractice`

## 2. Required User Flows
1. Home Dashboard
- Shows level, XP progress, streak, daily goal progress, badges.
- Primary CTA: Start Practice.
- Reminder toggle + reminder time controls.

2. Session Builder
- Template operations: New, Duplicate, Save, Delete, Select.
- Drill operations: Add (deterministic editable defaults), Remove, Reorder (long-press drag), Edit fields.
- Validation and errors surfaced in UI (no uncaught crashes).

3. Active Practice
- Drill countdown + session progress.
- Metronome default-on when session starts, with On/Off and BPM +/-5 controls.
- Metronome must produce audible tick playback from bundled offline asset.
- Pause/Resume + Skip controls.

4. Session Complete
- XP gain display, level-up state when applicable, streak confirmation, badges.

## 3. Domain Rules (Must Hold)
1. Validation
- Drill name is required.
- Drill duration must be 1-30 minutes.
- Drill BPM must be 40-240 when provided.
- Session template total duration must be >= 5 minutes.

2. Session accounting
- Completed minutes are only from completed drills.
- Skipped drills do not add completed minutes.
- Session `completed=true` only when all template drills are completed.

3. Progress and streak
- Goal progress uses today completed minutes vs daily target.
- Streak uses local day boundaries and practiced minutes > 0.

4. Badge unlock criteria
- `b1` (7-Day Streak): unlock when streak is >= 7 days.
- `b2` (Rhythm Keeper): unlock when completed sessions >= 5 and average BPM >= 100.
- `b3` (XP Hunter): unlock when session XP gained is >= 150.
- `b4` (Session Beast): unlock when completed drills in one session >= 4.

5. Persistence integrity
- Data is versioned and sanitized on load.
- Malformed drills/history entries are dropped.
- Invalid drill references in templates are removed.
- Template `totalDurationSeconds` is recomputed from valid drill refs.
- Goal settings are normalized to defaults when invalid.

## 4. Data Contract
1. drills
- `id`, `name`, `description?`, `durationSeconds`, `targetBpm?`, `tags[]`, `createdAt`, `updatedAt`

2. sessionTemplates
- `id`, `name`, `drillIds[]`, `totalDurationSeconds`, `isPreset`, `createdAt`, `updatedAt`

3. practiceHistory
- `id`, `sessionTemplateId?`, `sessionNameSnapshot`, `drillsSnapshot[]`, `completedDrillIds[]`, `startedAt`, `endedAt?`, `durationCompletedSeconds`, `completed`

4. goalSettings
- `dailyMinutesTarget`, `reminderEnabled`, `reminderTime`

5. profile
- `totalXp`, `unlockedBadgeIds[]`

6. persistence envelope
- `{ version, state }`

## 5. UI Contract (Locked)
- Dark-mode only.
- Token palette:
  - Background `#121212`
  - Surface `#1A1A1A`
  - Elevated `#222222`
  - Divider `#2A2A2A`
  - Primary Accent `#D97706`
  - Secondary Accent `#E6B980`
  - XP Highlight `#EAB308`
  - Primary Text `#F5F5F5`
  - Secondary Text `#B3B3B3`
  - Disabled `#6B7280`
- Rounded cards (16px).
- Accent usage only for CTA, XP, progress ring, active drill, streak indicator.
- Primary interactions >=44px touch targets.
- Motion timing: 180-220ms ease-in-out.
- Screen transitions must not use full-opacity fade-out to `0`; avoid flash/flicker on navigation.

## 6. Testing and Quality Gates
1. Local quality gate (required)
- `npm run check`
- Includes lint, typecheck, and coverage threshold enforcement.

2. Unit/integration coverage thresholds (vitest)
- lines >= 88
- statements >= 80
- functions >= 88
- branches >= 60

3. Detox iOS E2E required scenario coverage
- Add drill in Session Builder.
- Remove drill in Session Builder.
- Start session from Session Builder.
- Complete a session via Skip flow and reach complete screen.

4. Visual snapshot regression coverage
- Detox visual test captures screenshots for Home, Builder, Active, and Complete screens.
- Command: `npm run e2e:detox:visual:ios`
- Detox edge visual test captures Empty Builder, Builder validation error, and Active paused states.
- Command: `npm run e2e:detox:visual:edge:ios`

## 7. CI Contract
Current repository mode (cost-control): workflows are manual-only (`workflow_dispatch`).
- `CI` workflow (`.github/workflows/ci.yml`) contains the `quality` job on Ubuntu:
  - install deps
  - lint
  - typecheck
  - coverage tests
- `Detox iOS E2E` workflow (`.github/workflows/detox-ios.yml`) contains the macOS Detox job:
  - install deps/tools
  - prebuild iOS project
  - force deployment target to iOS 17.0
  - install pods
  - build Detox app
  - refresh Detox framework cache
  - run Detox tests
- When Actions credits are available, automatic triggers can be re-enabled.

## 8. Out of Scope (Current)
- Backend APIs
- Accounts/sync
- Social features

## 9. Stable Milestone
- Reference stability marker: `stable-2026-03-06-e2e-green`
- Reference commit: `bacf971`
- This marker indicates CI green baseline for quality + iOS Detox.
