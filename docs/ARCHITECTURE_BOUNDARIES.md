# Architecture Boundaries

This document defines the current ownership boundaries after the `App.tsx` refactor sequence (`#45`, `#46`, `#47`).

It is intentionally practical. Use it to decide where new code should live.

## Current Ownership

### `App.tsx`

`App.tsx` is the app shell.

It should:
- compose the top-level providers and screen tree
- connect shared hooks to screen components
- handle screen routing and cross-feature wiring
- keep top-level derived view state that only exists to coordinate screens

It should not:
- own persisted entity mutation logic
- own timer or metronome effect loops
- contain full screen implementations
- reimplement domain rules that already exist in `src/domain` or `src/application`

### `src/ui/screens/*`

Screen modules own screen rendering and screen-local view helpers.

They should:
- render the UI for a specific screen or a tightly related set of screens
- contain small formatting helpers that only matter to that screen
- use shared design tokens and shared UI building blocks

They should not:
- write persistence logic
- own cross-screen orchestration
- duplicate business rules from domain/application modules

### `src/app/*`

The `src/app` layer owns orchestration hooks and controllers.

Current examples:
- `usePracticeAppState.ts`: persisted app state, builder mutations, onboarding/goals/reminders orchestration
- `useActivePracticeRuntime.ts`: active practice runtime, timers, metronome wiring, completion flow
- `activePracticeRuntime.ts`: pure runtime helpers used by the active practice controller

This layer should:
- coordinate multiple domain/application modules
- translate app events into state transitions
- isolate side effects away from screens and the app shell

This layer should not:
- become a second UI layer
- contain raw persistence implementations
- absorb pure domain logic that can live in `src/domain`

### `src/domain/*`

The domain layer owns pure business rules and validation.

It should:
- define entities, invariants, and calculations
- remain framework-agnostic where practical
- be the default home for logic that can be tested without React or React Native

### `src/application/*`

The application layer owns service-style workflows that adapt domain logic to platform concerns.

Examples:
- reminder scheduling
- metronome audio
- session preparation
- template append workflows

### `src/persistence/*`

The persistence layer owns local storage and migration concerns.

It should:
- load and save persisted state
- handle storage migrations and recovery boundaries

It should not:
- make UI decisions
- own feature orchestration

## Guardrails For New Work

When adding new code:

- If it is a pure rule or calculation, prefer `src/domain`.
- If it coordinates side effects or multiple domain modules, prefer `src/app` or `src/application`.
- If it is a screen layout concern, prefer `src/ui/screens`.
- If it only exists to wire screens together, keep it in `App.tsx`.

Before adding logic to `App.tsx`, ask:

1. Does this logic exist only because multiple screens must be connected here?
2. Would this be easier to test if it moved into `src/app` or `src/domain`?
3. Is this actually screen UI that belongs in `src/ui/screens` instead?

If the answer to `2` or `3` is yes, do not put it in `App.tsx`.

## Regression Coverage

The current refactor guardrails are protected by focused tests:

- `tests/activePracticeRuntime.test.ts` covers the extracted active practice runtime helpers
- `tests/practiceAppState.test.ts` covers app-state seed creation, goal normalization, and badge mapping

When new orchestration is extracted, add small tests around the critical behavior that defines its contract.
