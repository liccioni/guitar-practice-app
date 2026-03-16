# Analytics Hook Map

This is the provider-agnostic event map for the core Fretline funnel.

The app currently emits these events through the shared analytics contract in [src/app/analytics.ts](/Users/liccioni/CodexProjects/fretline/src/app/analytics.ts). The default client is a no-op, so analytics can be wired to a real provider later without changing the product flow.

## Current Rule

- funnel events should be emitted through `src/app/analytics.ts`
- analytics must never block or break the core practice flow
- event names should stay stable once a provider is attached

## Implemented Funnel Events

### `onboarding_completed`

When it fires:
- after the starter questionnaire answers are saved

Current hook:
- [src/app/useProfileSettingsState.ts](/Users/liccioni/CodexProjects/fretline/src/app/useProfileSettingsState.ts)

Payload:
- `level`
- `durationMinutes`
- `focus`
- `outcome`
- `weeklyFrequencyDays`
- `practicePreference`
- `recommendedMinutes`
- `recommendationVersion`

### `starter_session_review_opened`

When it fires:
- when the onboarding recommendation is accepted and the user is sent into the starter session review

Current hook:
- [src/app/useProfileSettingsState.ts](/Users/liccioni/CodexProjects/fretline/src/app/useProfileSettingsState.ts)

Payload:
- `source`
- `sessionName`
- `recommendedMinutes`
- `drillCount`

### `session_started`

When it fires:
- when a session actually transitions into active practice

Current hook:
- [src/app/useActivePracticeRuntime.ts](/Users/liccioni/CodexProjects/fretline/src/app/useActivePracticeRuntime.ts)

Payload:
- `source`
- `sessionTemplateId`
- `sessionName`
- `drillCount`
- `plannedDurationSec`

### `drill_completed`

When it fires:
- once for each newly completed drill during active practice

Current hook:
- [src/app/useActivePracticeRuntime.ts](/Users/liccioni/CodexProjects/fretline/src/app/useActivePracticeRuntime.ts)

Payload:
- `sessionTemplateId`
- `sessionName`
- `drillId`
- `drillName`
- `drillIndex`
- `totalDrills`
- `gainedXp`
- `targetBpm`

### `session_completed`

When it fires:
- when the session ends and the app records the practice history entry

Current hook:
- [App.tsx](/Users/liccioni/CodexProjects/fretline/App.tsx)

Payload:
- `sessionTemplateId`
- `sessionName`
- `completionState`
- `completedDrillCount`
- `totalDrillCount`
- `durationCompletedSec`
- `elapsedSec`
- `sessionXp`

## Reserved Monetization Events

These event names are defined now so future paywall work can attach to them without renaming the funnel later.

### `upgrade_entry_opened`

Use when:
- a user opens a paywall, pricing screen, or premium gate from a product surface

Recommended payload:
- `entryPoint`
- `sourceScreen`

### `conversion_step_viewed`

Use when:
- a user reaches a meaningful monetization step such as pricing, purchase confirmation, restore flow, or plan selection

Recommended payload:
- `step`
- `planId`

## Provider Integration Notes

When attaching a real analytics provider:

- implement the provider adapter behind `setAnalyticsClient(...)`
- keep the event names unchanged
- avoid putting provider SDK calls directly in screens or domain modules
- add provider-specific normalization in the adapter, not in the product flow
