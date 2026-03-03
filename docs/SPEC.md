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
- Manage drills in template: add, remove, reorder (up/down controls).
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
- sanitize malformed persisted entities on load:
  - drop invalid drills/history records
  - drop invalid template drill references
  - recompute template `totalDurationSeconds` from valid drills
  - normalize invalid goal settings to defaults

## 5. UI Contract (Locked)
1. Visual system
- Dark mode only.
- Token palette is locked:
  - Background: `#121212`
  - Surface: `#1A1A1A`
  - Elevated: `#222222`
  - Divider: `#2A2A2A`
  - Primary Accent: `#D97706`
  - Secondary Accent: `#E6B980`
  - XP Highlight: `#EAB308`
  - Primary Text: `#F5F5F5`
  - Secondary Text: `#B3B3B3`
  - Disabled: `#6B7280`
- Rounded cards (16px).
- No admin/table style layouts.
- Accent colors are restricted to CTA, XP, progress ring, active drill state, and streak indicator.
- All cards use Surface color; elevated controls use Elevated color.
- Subtle glow is allowed for active state only.

2. Interaction quality
- Primary touch targets >= 44px.
- Primary transitions/micro-animations are 180-220ms `ease-in-out`.

3. Required screens
- Home Dashboard
- Session Builder
- Active Practice
- Session Complete

## 6. Non-Functional Contract
- Must run offline for MVP flows.
- `npm run check` must pass (lint, typecheck, coverage tests).
- Coverage thresholds are enforced in test config.
- UI interaction coverage is required for Session Builder core interactions:
  - add drill to selected template
  - fallback add drill behavior when active template id is null
  - explicit error path when no template exists
  - reorder controls (up/down) including boundary behavior
- E2E smoke coverage is required for critical path:
  - Home -> Start Practice -> Add Drill -> Start Session -> Active screen visible
- App IDs:
  - iOS bundle id: `net.liccioni.guitarpractice`
  - Android package: `net.liccioni.guitarpractice`
- EAS profiles required: `development`, `preview`, `production`.

## 7. Done Criteria (MVP)
Functional done when all required user flows work without runtime crashes (including malformed local state) and domain rules hold.
Quality done when `npm run check` passes and physical-device smoke tests pass on one iPhone and one Android device.
Automation done when Detox smoke test passes on iOS simulator for the critical path above.

## 8. Out of Scope (MVP)
- Accounts/sync
- Social/leaderboards
- Cloud/backend API
