# Device QA Checklist

Use this as the lightweight release validation pass before cutting iOS or Android builds.

The goal is not exhaustive coverage. The goal is to verify the critical product journey, catch the highest-risk regressions, and pair that manual pass with the strongest automated smoke coverage already in the repo.

## Release Gate

Run these in order:

```bash
npm run check
npm run e2e:maestro:ios
npm run e2e:android:smoke
```

Add these when the release includes visual or design-heavy changes:

```bash
npm run e2e:detox:visual:ios
npm run e2e:detox:visual:edge:ios
npm run parity:stitch
```

## Automated Smoke Coverage

### iOS

Primary smoke suite:

```bash
npm run e2e:maestro:ios
```

This should cover:
- home hub loads with the primary entry points visible
- first-run onboarding can generate a starter session
- the builder can start a session and complete the core practice path

Reference:
- [docs/MAESTRO_MIGRATION.md](/Users/liccioni/CodexProjects/fretline/docs/MAESTRO_MIGRATION.md)

### Android

Primary smoke suite:

```bash
npm run e2e:android:smoke
```

Targeted follow-up smoke:

```bash
npm run e2e:android:onboarding
npm run e2e:android:regression:start-session
```

This should cover:
- clean launch on device or emulator
- onboarding controls on first run
- start-session path remains intact after app launch

## Manual Device Pass

Run the manual pass on:
- one iPhone simulator or device
- one Android emulator or device

Use a clean install or reset app data before starting.

### 1. First-Run Activation

Verify:
- the home screen loads without broken layout or clipped controls
- the onboarding card explains the setup clearly
- selecting level and session length creates a trustworthy starter recommendation
- the primary onboarding CTA opens the session overview, not a confusing dead-end

Pass condition:
- a new user can move from first launch to a reviewable starter session without guessing what to do next

### 2. Session Start

Verify:
- the session overview shows name, drills, time estimate, and XP
- starting practice moves into active practice immediately
- the first drill loads with timer, metronome controls, and progress visible

Pass condition:
- the user can clearly understand what session is about to start and can begin practice without broken navigation

### 3. Active Practice Loop

Verify:
- pause/resume works
- skip works
- metronome toggle and BPM stepping work
- drill-complete transition appears and previews what comes next
- session completion lands on the summary screen without crashes

Pass condition:
- the main practice loop works end-to-end and feels stable through at least one full session

### 4. Home and Progress Feedback

Verify after completing a session:
- home reflects updated XP, streak, or goal feedback
- progress screen opens and shows believable recent-session data
- profile still loads badges/level state without blank or duplicate content

Pass condition:
- progression feedback updates across the post-session surfaces that matter most to retention

### 5. Navigation and Persistence

Verify:
- switching between Home, Sessions, Songs, Progress, and Profile does not lose state unexpectedly
- returning to the builder preserves the current template/session setup
- force closing and reopening the app preserves saved templates and history

Pass condition:
- the app keeps the user’s current state and saved data across normal navigation and relaunch

## Major Regression Risks

Pay extra attention to these because they have changed recently:
- onboarding handoff from home into the starter session review
- session overview to active practice transition
- drill-complete transition during active practice
- dashboard streak, goal, and XP feedback after a completed session

## When To Expand The Pass

Add more checks only when the release touches these areas:
- use visual parity checks when layout or design fidelity changed
- run extra Detox iOS suites when builder validation, reorder, or visual-state behavior changed
- extend Android smoke only when launch or practice routing changed

If a release does not touch those areas, keep the pass small.
