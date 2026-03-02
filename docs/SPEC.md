# Guitar Practice Tool - Product Specification (MVP)

## 1. Product Overview

### Purpose
A mobile-first guitar practice app that helps musicians build structured practice templates, run timed sessions with metronome support, and track progress over time.

### Target Platforms
- iOS (Expo React Native)
- Android (Expo React Native)
- Optional web preview for development

### MVP Architecture Decision
- **MVP is local-first and offline-first.**
- All user data is stored on-device.
- Data does not leave the device in MVP.

## 2. Core Features (MVP)

1. Drill Management
- Create and delete custom drills (domain supports updates; full drill edit UI is deferred).
- Drill fields: name, optional description, duration, optional target BPM, tags.

2. Session Builder
- Combine drills into reusable session templates.
- Provide prebuilt quick-start templates (20m, 30m, 60m).

3. Active Practice Mode
- Timer-driven segment runtime with `idle/running/paused/segmentComplete/finished` state machine.
- Segment completion flow supports explicit `Next` action.
- Pause/resume and skip controls.
- Real-time timer display for current drill and session total.

4. Integrated Metronome
- BPM range: 40-240.
- Runtime BPM adjustment controls (+/- 5).
- Metronome on/off toggle with visual beat indicator.

5. Practice History & Stats
- Persist completed and incomplete sessions locally.
- Dashboard metrics: total practice minutes, sessions completed, weekly minutes, today minutes, average BPM, goal progress.
- Daily goal settings, current streak, and optional daily reminder scheduling.

## 3. Functional Rules

1. Validation
- Drill name is required.
- Drill duration must be between 1 and 30 minutes.
- Session total must be at least 5 minutes to save.
- BPM (if provided) must be between 40 and 240.

2. Completion and Time Accounting
- Completed minutes are counted only for drills that finish naturally or are explicitly marked complete.
- Skipped drills do not count as completed minutes.
- Session status is `completed` only when all drills are completed.

3. History Integrity
- Editing a template never mutates previously saved history records.
- History records store a snapshot of session and drill names used at runtime.

4. Goal and Streak Rules
- Goal progress is based on today minutes vs daily target.
- Streak is calculated from consecutive local calendar days with practiced minutes > 0.

## 4. Data Model (Local Storage)

### `drills`
- `id: string`
- `name: string`
- `description?: string`
- `durationSeconds: number`
- `targetBpm?: number`
- `tags: ("warmup" | "technique" | "scales" | "chords" | "rhythm" | "songs" | "improv")[]`
- `createdAt: string (ISO)`
- `updatedAt: string (ISO)`

### `sessionTemplates`
- `id: string`
- `name: string`
- `drillIds: string[]`
- `totalDurationSeconds: number`
- `isPreset: boolean`
- `createdAt: string (ISO)`
- `updatedAt: string (ISO)`

### `practiceHistory`
- `id: string`
- `sessionTemplateId?: string`
- `sessionNameSnapshot: string`
- `drillsSnapshot: { id: string; name: string; durationSeconds: number; targetBpm?: number }[]`
- `completedDrillIds: string[]`
- `startedAt: string (ISO)`
- `endedAt?: string (ISO)`
- `durationCompletedSeconds: number`
- `completed: boolean`

### `goalSettings`
- `dailyMinutesTarget: number`
- `reminderEnabled: boolean`
- `reminderTime: string` (`HH:MM`)

### Persistence Envelope
- `version: number`
- `state: { drills, sessionTemplates, practiceHistory, goalSettings }`
- Legacy unversioned payloads are migrated on load.

## 5. Technical Stack (MVP)

### Frontend
- Expo SDK 54 / React Native 0.81.5 / TypeScript
- React state/hooks for MVP state management
- Local persistence via on-device storage abstraction
- Notifications via `expo-notifications`

### Build and Distribution
- EAS build profiles: `development`, `preview`, `production`
- iOS bundle ID: `net.liccioni.guitarpractice`
- Android package: `net.liccioni.guitarpractice`
- Beta distribution: TestFlight (iOS), Play Internal Testing (Android)

## 6. Non-Functional Requirements

1. App start to interactive state under 2s on a mid-tier device.
2. Session controls (pause/resume/skip) respond in under 100ms.
3. MVP remains fully usable without internet.
4. TypeScript and lint checks pass in CI.
5. Core domain logic coverage target: >= 80%.
6. Accessibility labels are present on primary controls and navigation actions.

## 7. Out of Scope (Post-MVP)

1. User accounts and multi-device sync.
2. Social features and leaderboards.
3. Advanced metronome features (all subdivisions/time signatures from full spec).
4. Cloud/backend API.

## 8. Canonical Examples

### Example A: Valid session flow
Input:
- Session template: Warmup 5m, Scales 10m, Song 15m.

Output:
- Total 30m session runs drill-by-drill.
- History record saved with `completed=true` and `durationCompletedSeconds=1800`.

### Example B: Invalid save blocked
Input:
- Drill duration = 0 minutes.
- Target BPM = 300.

Output:
- Save blocked with validation errors for duration and BPM range.

### Example C: Goal progress and streak
Input:
- Daily goal is 30 minutes.
- User completes one 15-minute session today.

Output:
- Dashboard shows `todayMinutes=15`, `goalProgress=50%`, and streak increments for today.
