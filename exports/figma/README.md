# Figma Export Package

This package contains UI screen exports and a Figma-ready handoff spec for rebuilding editable frames.

## Screens Folder
- Path: `exports/figma/screens`
- Format: PNG
- Resolution: `1170x2532` (iPhone portrait)

## Included Screens
1. `home.png`
2. `builder-random-cue-preview.png`
3. `session-builder.png`
4. `builder-empty.png`
5. `builder-validation-error.png`
6. `builder-long-name-layout.png`
7. `active-practice.png`
8. `active-paused.png`
9. `session-complete.png`

## Import Into Figma
1. Create a new Figma file.
2. Drag all PNG files from `exports/figma/screens/` into the canvas.
3. Set each frame name according to `exports/figma/screen-manifest.csv`.
4. Build component overlays using `exports/figma/FIGMA_HANDOFF_SPEC.md`.

## Notes
- These are image exports (not editable layers).
- Sources are the latest passing visual suites from `2026-03-08` (`20-35-14Z` primary + `20-35-53Z` edge).
