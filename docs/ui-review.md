# Fretline UI Review Checklist

Use this checklist before merging any UI change.

## Action Hierarchy
- Is there one clear primary action?
- Can the user identify the next step within 3 seconds?
- Are secondary and destructive actions clearly demoted?

## Clarity
- Is the screen understandable without explanation?
- Are labels concrete and musician-oriented?
- Does the layout avoid clutter, duplicate messaging, and stacked low-value cards?

## Control Discipline
- Are there unnecessary controls, toggles, or settings visible?
- Are advanced options hidden until needed?
- Does each control belong to the current user moment?

## Design System Compliance
- Does the screen follow `docs/design-system.md`?
- Does it use the dark/charcoal creative direction instead of admin-panel patterns?
- Are spacing, typography, and component weights consistent with the rest of the app?

## Product Feel
- Does the screen feel like a guitar/music practice tool?
- Does it avoid form-heavy, dashboard-like, or office-tool styling?
- Does the builder feel creative and active practice feel immersive?

## State Quality
- Are loading, empty, error, and success states present where needed?
- Do those states explain what happens next?
- Is feedback immediate without becoming noisy?

## Review Evidence
- Include screenshots for visual changes when possible.
- If screenshots are not included, add manual QA notes covering the changed screens and states.
