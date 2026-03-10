# Fretline Design System Master (Mobile)

This file is the Fretline-adapted output derived from `ui-ux-pro-max-skill`, constrained to the current React Native/Expo codebase and product direction.
Screen-level source references now come from Stitch imports at `docs/design-import/stitch/stitch/*`.

Use page overrides first: `docs/design-system/fretline/pages/<screen>.md`.

## Product Intent
- Feel: pedalboard + studio gear + progression game.
- Platform: mobile-first React Native (iOS + Android parity).
- Rule: no functional regressions; keep existing behavior and tests green.

## Visual Foundations

### Core Color Tokens (Current App-Aligned)
- `bg.base`: `#0F0F10`
- `bg.surface`: `#171718`
- `bg.elevated`: `#222224`
- `border.default`: `#2E2E31`
- `text.primary`: `#F5F5F4`
- `text.secondary`: `#B8B8B5`
- `accent.primary`: `#D97706`
- `accent.secondary`: `#F59E0B`
- `xp.highlight`: `#FACC15`
- `state.disabled`: `#6B7280`

### Semantic Usage
- Primary CTA and progress fill: `accent.primary`
- Reward and XP deltas: `xp.highlight`
- Non-critical actions: neutral surface + border
- Danger/destructive actions: existing danger token only

### Typography
- Keep current app font stack for stability.
- Scale:
- `display`: 40/48
- `h1`: 36/42
- `h2`: 28/34
- `title`: 22/28
- `body`: 18/24
- `meta`: 14/20

### Spacing and Shape
- 4pt spacing scale.
- Section gaps: 16/24/32.
- Touch targets: minimum 44x44.
- Radius:
- `sm` 12
- `md` 16
- `lg` 24
- `pill` 999

### Motion
- Standard duration: 180-220ms.
- Feedback pulses (XP/random cue): 450-700ms repeating.
- Respect reduced motion settings.

## Component Principles

### Button Hierarchy
- `Primary`: one per screen maximum.
- `Secondary`: supporting choices only.
- `Ghost`: tertiary/destructive utilities.

### Card Hierarchy
- Avoid card overload.
- Use one hero surface plus lightweight list rows.
- Drill rows prioritize: title readability > metadata > utility controls.

### Drill Card Layout Rules
- Never overlap XP and title.
- Title gets max width priority with two-line clamp.
- Move utility controls to compact trailing cluster.
- Keep remove action visible but visually secondary.

### Practice Focus Rules
- Timer/ring is visual hero.
- One dominant decision at a time (Play/Pause or Next).
- Metronome controls grouped as an instrument tool strip.

## Accessibility Baseline
- Contrast target WCAG AA minimum.
- Every interactive element has `accessibilityRole` + label.
- Preserve testIDs used in Detox.

## Anti-Patterns
- Admin/dashboard visual density on primary practice surfaces.
- Multiple competing primary CTAs on one screen.
- Decorative motion that obscures tempo or countdown readability.
