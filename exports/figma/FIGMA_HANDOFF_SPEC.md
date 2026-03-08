# Figma Handoff Spec

## 1. Frame Setup
- Device frame size: `1170 x 2532`
- Orientation: portrait
- Safe area strategy:
  - Top padding baseline: `60`
  - Horizontal page padding: `32`
  - Section vertical rhythm: `16` to `24`
  - Bottom floating action button clearance: `120`

## 2. Design Tokens
Use these as Figma color styles:
- `Background / Base`: `#0F0F10`
- `Surface / Card`: `#171718`
- `Surface / Elevated`: `#222224`
- `Border / Divider`: `#2E2E31`
- `Accent / Primary`: `#D97706`
- `Accent / Secondary`: `#F59E0B`
- `Accent / XP`: `#FACC15`
- `Text / Primary`: `#F5F5F4`
- `Text / Secondary`: `#B8B8B5`
- `Text / Disabled`: `#6B7280`

## 3. Typography Mapping
Create text styles:
- `Display / H1`: 64, Bold
- `Title / H2`: 42, Bold
- `Section / Label`: 24, SemiBold, uppercase tracking +2%
- `Body / Primary`: 20, Regular
- `Body / Secondary`: 18, Regular
- `Button / Primary`: 24, Bold
- `Button / Secondary`: 18, SemiBold

## 4. Radius and Elevation
- Card radius: `16`
- Pill/button radius: `20` to `28`
- Floating action button radius: full round
- Card shadow (soft): y `6`, blur `20`, color black at 24%

## 5. Core Components to Rebuild in Figma
1. `Top Bar`
- Back button
- Screen title
- XP chip

2. `Primary Card`
- Rounded container
- Section heading + body content
- Optional inline controls

3. `Primary CTA`
- Full-width orange button
- White bold text

4. `Secondary CTA`
- Full-width dark elevated button
- White semi-bold text

5. `Drill Card`
- Index label (`#N`)
- Multi-line title (truncate at 2 lines)
- Metadata row (`duration • BPM`)
- XP label
- Up/down controls
- Remove action

6. `FAB`
- Bottom-right circular add button

7. `Random Cue Card`
- Current cue label
- Upcoming cue label
- Trigger proximity indicator
- Pulse affordance (documented motion)

## 6. Screen Mapping
- `home.png`: dashboard default state
- `builder-random-cue-preview.png`: builder random cue configured state
- `session-builder.png`: populated builder state
- `builder-empty.png`: empty builder state
- `builder-validation-error.png`: inline validation state
- `builder-long-name-layout.png`: long title stress state
- `active-practice.png`: in-session active state
- `active-paused.png`: paused state
- `session-complete.png`: completion state

## 7. Figma Reconstruction Workflow
1. Import PNGs to separate frames.
2. Lock the PNG layer in each frame.
3. Rebuild components on top using Auto Layout where possible.
4. Convert repeated structures into components and variants:
- Buttons: primary/secondary/disabled
- Drill cards: default/long-title/error
- Session cards: default/empty/error
- Active cue card: idle/pulse/triggered
5. Remove PNG layer once editable rebuild matches.

## 8. QA Checklist Before Sharing Figma
- All frames use `1170x2532`.
- Color styles match token list exactly.
- CTA sizes are consistent across frames.
- Drill card long-title variant has no text overlap.
- Random-cue preview frame included.
