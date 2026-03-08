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
- Shows level, XP progress, goal streak, goal progress, badges.
- Shows weekly summary analytics and recent-session insights (duration, avg BPM, completion).
- Includes onboarding questionnaire for suggested starter session (level, duration, focus, outcome).
- Primary CTA: Start Practice.
- Reminder toggle + reminder time controls.
- Goal type controls (`minutes`, `sessions`, `drills`) and editable goal target.

2. Session Builder
- Template operations: New, Duplicate, Save, Delete, Select.
- Drill operations: Add (deterministic editable defaults), Remove, Reorder (up/down controls), Edit fields.
- Drill supports optional random cue configuration (`note` / `triad` / `fingers4`, every N bars).
- Validation and errors surfaced in UI (no uncaught crashes).

3. Active Practice
- Drill countdown + session progress.
- Metronome default-on when session starts, with On/Off and BPM +/-5 controls.
- Metronome must produce audible tick playback from bundled offline asset.
- Random cue card shows current cue, upcoming cue, and beats to next trigger when configured.
- Pause/Resume + Skip controls.

4. Session Complete
- XP gain display, level-up state when applicable, streak confirmation, badges.

## 3. Domain Rules (Must Hold)
1. Validation
- Drill name is required.
- Drill duration must be 1-30 minutes.
- Drill BPM must be 40-240 when provided.
- Random cue interval must be 1-16 bars when random cue is enabled.
- Session template total duration must be >= 5 minutes.

2. Session accounting
- Completed minutes are only from completed drills.
- Skipped drills do not add completed minutes.
- Session `completed=true` only when all template drills are completed.

3. Progress and streak
- Goal progress uses selected goal type:
  - `minutes`: today completed minutes
  - `sessions`: today completed sessions
  - `drills`: today completed drills
- Goal streak uses local day boundaries and counts consecutive days meeting the selected goal target.

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
- `id`, `name`, `description?`, `durationSeconds`, `targetBpm?`, `tags[]`, `randomizer?`, `createdAt`, `updatedAt`

2. sessionTemplates
- `id`, `name`, `drillIds[]`, `totalDurationSeconds`, `isPreset`, `createdAt`, `updatedAt`

3. practiceHistory
- `id`, `sessionTemplateId?`, `sessionNameSnapshot`, `drillsSnapshot[]`, `completedDrillIds[]`, `startedAt`, `endedAt?`, `durationCompletedSeconds`, `completed`

4. goalSettings
- `dailyMinutesTarget`, `goalType`, `goalTarget`, `reminderEnabled`, `reminderTime`

5. profile
- `totalXp`, `unlockedBadgeIds[]`, `onboarding`

6. persistence envelope
- `{ version, state }`

## 5. UI Contract (Locked)
- Dark-mode only.
- Token palette:
  - Background `#0F0F10`
  - Surface `#171718`
  - Elevated `#222224`
  - Divider `#2E2E31`
  - Primary Accent `#D97706`
  - Secondary Accent `#F59E0B`
  - XP Highlight `#FACC15`
  - Primary Text `#F5F5F4`
  - Secondary Text `#B8B8B5`
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
- lines >= 95
- statements >= 95
- functions >= 95
- branches >= 95
- enforced per-file and globally via `vitest.config.ts`.

3. Detox iOS E2E required scenario coverage
- Add drill in Session Builder.
- Remove drill in Session Builder.
- Start session from Session Builder.
- Complete a session via Skip flow and reach complete screen.

4. Visual snapshot regression coverage
- Detox visual test captures screenshots for Home, Builder, Builder Random Cue Preview, Active, and Complete screens.
- Command: `npm run e2e:detox:visual:ios`
- Detox edge visual test captures Empty Builder, Builder validation error, Active paused, and long-title builder layout states.
- Command: `npm run e2e:detox:visual:edge:ios`
- Home scroll reachability must be validated by dedicated e2e coverage (`e2e/home-scroll.e2e.js`).

5. Coverage requirement policy
- Minimum required automated coverage target is **95%**.
- Requirement scope:
  - Unit/integration coverage across application, domain, and persistence modules.
  - Critical UX flows must be covered by Detox e2e (home navigation/scroll reachability, builder edit/reorder/remove, active flow, complete flow).
- Merge policy:
  - New features/fixes must include tests that prevent regression of changed behavior.
  - Work that cannot immediately satisfy the 95% threshold must include an explicit gap note and a scheduled follow-up task before release signoff.
- Enforcement command:
  - `npm run stability:all` (cross-platform local gate for quality + iOS suites + Android smoke/regression).

## 7. CI Contract
Current repository mode (cost-control): workflows are manual-only (`workflow_dispatch`).
- `CI` workflow (`.github/workflows/ci.yml`) contains the `quality` job on Ubuntu:
  - install deps
  - run strict check gate (`npm run check`: lint + typecheck + per-file 95% coverage)
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

## 9. Verified Milestone
- Latest verified main commit (runtime/features): `a2867de`
- Historical stable tag reference: `stable-2026-03-08-strict-coverage-green`
- Rebuild instructions are authoritative in `docs/PROJECT_RUNBOOK.md`.
