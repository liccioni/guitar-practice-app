# Next Feature Plan

Date: 2026-03-07
Status: Approved for implementation batching

## Superseded Notice (2026-03-10)
This pre-Stitch roadmap is retained for historical context only.
Active roadmap and parity tracking moved to:
- `docs/STITCH_FLOW_FEATURE_PLAN.md`
- `docs/UI_UX_IMPLEMENTATION_PLAN.md`

## Objectives
1. Add optional random variation events to drills with clear visual timing cues.
2. Add a short onboarding questionnaire that generates a personalized starter training plan.
3. Launch a conversion-focused website on the `gh-pages` branch.

## Constraints
- Do not rely on GitHub Actions credit-heavy pipelines.
- Keep iOS stability as first-class (no regressions to current passing visual/smoke suites).
- Preserve existing builder/session flow behavior when new features are disabled.

## Epic 1: Random Variation Engine

### Product intent
Allow a drill to optionally inject random prompts at predictable musical intervals (bar-based), with a clear upcoming cue and active prompt display.

### Scope
- Optional per-drill variation config.
- Variation types:
  - Random note
  - Random triad (major/minor)
  - Random 4-finger sequence
- Interval setting: trigger every N bars (N user-selectable).
- Active-session UI cue:
  - Next prompt preview
  - Pulsating visual cue before trigger
  - Current prompt shown on trigger window

### Out of scope (batch 1)
- Audio voice prompts.
- Genre/style-specific prompt pools.
- Adaptive difficulty based on performance telemetry.

### Domain model changes
- Extend drill model with optional variation settings:
  - `variationMode: "none" | "random_note" | "random_triad" | "random_finger_sequence"`
  - `variationIntervalBars: number | null`
  - `variationEnabled: boolean`
- Add runtime variation state for active drill:
  - `currentPrompt`
  - `nextPrompt`
  - `nextTriggerBeatIndex`
  - `pulseWindowActive`

### Engine behavior
- If variation disabled or mode `none`: no prompt events.
- If enabled:
  - Compute beats-per-bar (default 4 for MVP).
  - Trigger at `variationIntervalBars * beatsPerBar` intervals.
  - Generate `nextPrompt` ahead of trigger.
  - Enter pulse window in final beat before trigger.
  - Promote `nextPrompt` -> `currentPrompt` at trigger, then generate next.

### Prompt pools (MVP)
- Random note: natural notes A-G.
- Random triad: root + quality (`major`/`minor`).
- 4-finger sequence: permutations from constrained safe list (e.g., `1234`, `1324`, `1432`, etc.).

### UI changes
- Session Builder drill editor:
  - Toggle: `Variation` on/off.
  - Type selector.
  - Interval bars selector (1,2,4,8 + custom numeric).
- Active session card:
  - `Next prompt` label.
  - Pulsating cue ring/dot synced to pulse window.
  - `Now: <prompt>` display during active window.

### Persistence and migration
- Migration: existing drills default to disabled variation (`variationEnabled=false`, mode `none`).
- Backward compatibility: sanitize invalid variation payloads to disabled state.

### Testing
- Unit:
  - Prompt generation by mode.
  - Trigger schedule math by BPM/time/bar interval.
  - Pulse window transitions.
- Integration:
  - Start session with varied drills and ensure prompt timeline is deterministic.
- E2E:
  - Configure variation in builder.
  - Start session and verify cue/prompt appears.

### Acceptance criteria
- User can enable/disable variation per drill.
- User sees upcoming and active prompt in active session.
- Cue appears before each trigger.
- No regressions to existing session completion flow.

## Epic 2: Onboarding + Recommendation Engine

### Product intent
Collect minimal profile signals and generate a practical starting template users can immediately run or edit.

### Questionnaire (MVP)
- Skill level: Beginner / Intermediate / Expert
- Available practice time: 20 / 30 / 60 minutes
- Primary focus: Technique / Rhythm / Chords / Lead / Improvisation
- Weekly frequency: 3 / 5 / 7 days
- Practice preference: Structured / Balanced / Exploratory

### Recommendation output
- One suggested starter template with:
  - Template name
  - Drill set and order
  - Per-drill duration and target BPM range
  - Optional variation defaults (off for beginners by default)

### Decision logic (MVP deterministic)
- Rule-based matrix by skill level and focus.
- Duration budget allocated across warmup/core/cooldown.
- BPM seeded by level and drill type.
- Weekly frequency influences challenge intensity only (not template duration).

### UI flow
- First launch:
  - `OnboardingIntro` -> question steps -> `SuggestedPlan`
- `SuggestedPlan` actions:
  - Accept and continue
  - Edit in Builder
  - Skip onboarding
- Settings:
  - `Retake Onboarding` action

### Data model changes
- Persisted profile:
  - `skillLevel`, `practiceTimeMinutes`, `focusArea`, `weeklyFrequency`, `practicePreference`
  - `onboardingCompletedAt`
- Recommendation metadata:
  - `recommendationVersion`

### Persistence and migration
- Existing users default to `onboarding not completed` but app should not block usage.
- If onboarding skipped, keep current default template behavior.

### Testing
- Unit:
  - Recommendation matrix outputs valid templates.
  - Duration budget equals selected time target.
- Integration:
  - Accept recommendation creates/sets active template.
- E2E:
  - First-run questionnaire completion path.
  - Accept suggestion and start session.

### Acceptance criteria
- New users can complete onboarding in under 60 seconds.
- Suggested plan is immediately playable.
- Users can edit before committing.

## Epic 3: `gh-pages` Marketing Website

### Product intent
Create a simple, high-conversion website to communicate value and capture subscriptions/waitlist interest.

### Scope
- Static site on `gh-pages` branch.
- Sections:
  - Hero (value proposition + CTA)
  - Feature proof (builder, progress, variation prompts)
  - Social proof placeholders
  - Pricing/waitlist block
  - FAQ
  - Contact/footer
- CTA targets:
  - Email waitlist capture and/or subscription interest form

### Out of scope (MVP)
- Full auth billing flow on website.
- CMS-driven content pipeline.

### Technical plan
- Keep site static (plain HTML/CSS/JS or lightweight framework build output committed to `gh-pages`).
- Manual deployment steps documented (no CI dependence).
- Add lightweight analytics snippet and conversion event hooks.

### Messaging direction
- Promise: focused deliberate practice, not generic tab browsing.
- Core differentiators:
  - Structured session builder
  - Goal + streak progression
  - Optional random variation challenges

### Acceptance criteria
- Site deployed and reachable via GitHub Pages URL.
- Mobile-first responsive and fast load.
- CTA conversion capture verified end-to-end.

## Delivery Batches

### Batch A (Foundation)
1. Add variation config fields to drill/domain/persistence (disabled by default).
2. Add onboarding profile model and persistence.
3. Implement recommendation rule engine with unit tests.
4. Add onboarding UI and `SuggestedPlan` flow.

Definition of done:
- `npm run check` green.
- Existing iOS visual + builder smoke green.
- New unit/integration tests for recommendation and migrations green.

### Batch B (Active variation UX)
1. Implement variation scheduler/runtime state in active session.
2. Add cue + prompt UI in active screen.
3. Add builder drill editor controls for variation settings.
4. Add E2E coverage for variation-enabled drill run.

Definition of done:
- Cue and prompt behavior visible and deterministic.
- No regressions in pause/skip/complete paths.

### Batch C (Website)
1. Create `gh-pages` branch site scaffold.
2. Implement copy + visuals + CTA.
3. Add analytics/event hooks.
4. Document manual deployment and content update workflow.

Definition of done:
- Live site + validated CTA capture.

## Risks and mitigations
- Risk: cue timing drift due to timer jitter.
  - Mitigation: derive trigger schedule from beat index, not frame timing.
- Risk: onboarding overfits and gives weak suggestions.
  - Mitigation: keep deterministic rule table + explicit v1 constraints.
- Risk: iOS UI regressions in builder/active screens.
  - Mitigation: keep visual snapshots updated and require before merge.

## Next implementation order (recommended)
1. Epic 2 (Onboarding + Recommendation)
2. Epic 1 (Variation Engine)
3. Epic 3 (`gh-pages` site)

Reason: personalized defaults improve immediate UX and provide better messaging inputs for the marketing site.
