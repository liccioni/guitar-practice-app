# Fretline Design System

## Visual Direction
- Default to dark charcoal surfaces with warm contrast, not light dashboards.
- The app should feel like a modern practice tool for musicians: focused, tactile, slightly dramatic.
- Avoid SaaS/admin styling: flat white panels, thin gray dividers, dense tables, and form-heavy grids.

## Color Usage
- Use a charcoal-to-black base for primary surfaces.
- Use one warm accent family for primary actions and momentum states.
- Use muted neutrals for secondary surfaces and supporting copy.
- Reserve status colors for real state changes:
  - green: active/live/success
  - amber/orange: primary action, momentum, XP, streak
  - red: destructive or blocking error
- Do not use many accent colors on one screen.

## Typography
- Headline: bold, compact, high contrast. Used for screen identity and major session moments.
- Section title: smaller, still strong, used to group one clear concept.
- Body: readable, medium contrast, short paragraphs.
- Meta labels: uppercase or condensed, used sparingly for supporting context.
- Do not stack too many text tiers in one card.

## Spacing
- Prefer generous vertical spacing over dense packing.
- Use consistent rhythm:
  - screen sections should read as clear blocks
  - cards should have enough padding to feel touchable
  - related controls should group tightly; unrelated controls should separate visibly
- If a screen feels crowded, remove content before reducing spacing.

## Component Principles

### Buttons
- One primary action per screen section.
- Primary buttons should be visually obvious within 3 seconds.
- Secondary buttons should support, not compete.
- Destructive actions must never look primary.

### Cards
- Cards should group one idea: session launch, progress, onboarding, practice aids.
- Do not use cards as generic containers for unrelated controls.
- Prefer fewer, clearer cards over stacked informational blocks.

### Inputs
- Inputs should feel creative and lightweight, not back-office.
- Only show fields needed for the current decision.
- Use progressive disclosure for advanced options.

### Lists
- Lists should expose the next action clearly.
- Reorderable or editable lists must remain readable before interaction.
- Avoid nested controls that make the list feel like a form.

## Feedback States

### Loading
- Keep loading calm and minimal.
- Prefer skeleton structure or short inline status over blocking spinners.

### Empty
- Empty states should tell the user what to do next.
- Avoid generic “nothing here” copy.

### Error
- Error states should be specific and actionable.
- Explain what failed and what the user can do now.

### Success
- Success should be immediate but brief.
- Use XP, streak, completion, and progress feedback to reinforce momentum without slowing the user down.
