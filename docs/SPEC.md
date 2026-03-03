# Guitar Practice App - MVP Spec (Lean)

This document is the implementation contract. It defines what must be built and what is considered correct.

## 1. Product Contract
- Platform: Expo React Native mobile app (iOS + Android).
- Architecture: local-first and offline-first.
- Data: all MVP user data remains on-device.
- UX style: dark mode only, gamified coach experience.

## 2. Required User Flows
1. Home dashboard
- Show level, XP progress, streak, daily goal progress, and achievements.
- Show primary `Start Practice` CTA.
- Allow reminder toggle and reminder time save.

2. Session builder
- Manage templates: create, select, rename, save, delete, duplicate.
- Manage drills in template: add, remove, reorder.
- Allow editing drill name, duration, BPM.

3. Active practice
- Run timed session drill-by-drill.
- Show current drill timer and session progress.
- Provide pause/resume/skip controls.
- Provide metronome toggle and BPM +/- controls.

4. Session complete
- Show session XP gain.
- Show level-up state when applicable.
- Confirm streak and badge state.

## 3. Domain Rules (Must Hold)
1. Validation
- Drill name is required.
- Drill duration must be 1-30 minutes.
- Drill BPM must be 40-240 when provided.
- Session template total duration must be >= 5 minutes.

2. Session accounting
- Only completed drills add to completed minutes.
- Skipped drills never add to completed minutes.
- Session `completed=true` only when all drills are completed.

3. Progress logic
- Goal progress = today completed minutes / daily target.
- Streak uses local calendar day boundaries.

4. History integrity
- History entries store snapshots used at runtime.
- Template edits do not mutate past history entries.

## 4. Data Contract
## 4.1 drills
- `id`, `name`, `description?`, `durationSeconds`, `targetBpm?`, `tags[]`, `createdAt`, `updatedAt`

## 4.2 sessionTemplates
- `id`, `name`, `drillIds[]`, `totalDurationSeconds`, `isPreset`, `createdAt`, `updatedAt`

## 4.3 practiceHistory
- `id`, `sessionTemplateId?`, `sessionNameSnapshot`, `drillsSnapshot[]`, `completedDrillIds[]`, `startedAt`, `endedAt?`, `durationCompletedSeconds`, `completed`

## 4.4 goalSettings
- `dailyMinutesTarget`, `reminderEnabled`, `reminderTime`

## 4.5 Persistence envelope
- versioned envelope: `{ version, state }`
- migrate legacy unversioned payloads on load

## 5. UI Contract (Locked)
1. Visual system
- Dark mode only.
- Base background `#121212`.
- Rounded cards (16px).
- Accent family: electric blue / neon green.
- No admin/table style layouts.

2. Interaction quality
- Primary touch targets >= 44px.
- Primary transitions/micro-animations around 200ms.

3. Required screens
- Home Dashboard
- Session Builder
- Active Practice
- Session Complete

## 6. Non-Functional Contract
- Must run offline for MVP flows.
- `npm run check` must pass (lint, typecheck, coverage tests).
- Coverage thresholds are enforced in test config.
- App IDs:
  - iOS bundle id: `net.liccioni.guitarpractice`
  - Android package: `net.liccioni.guitarpractice`
- EAS profiles required: `development`, `preview`, `production`.

## 7. Done Criteria (MVP)
Functional done when all required user flows work without runtime crashes and domain rules hold.
Quality done when `npm run check` passes and physical-device smoke tests pass on one iPhone and one Android device.

## 8. Out of Scope (MVP)
- Accounts/sync
- Social/leaderboards
- Cloud/backend API
