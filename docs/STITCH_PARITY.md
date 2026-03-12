# Stitch Parity Gate

This is the strict visual parity process against imported Stitch designs.

## Source Of Truth
- `docs/design-import/stitch/stitch/main_practice_hub/screen.png`
- `docs/design-import/stitch/stitch/songs_library/screen.png`
- `docs/design-import/stitch/stitch/drill_builder/screen.png`
- `docs/design-import/stitch/stitch/practice_session/screen.png`
- `docs/design-import/stitch/stitch/session_summary/screen.png`
- `docs/design-import/stitch/stitch/progress_dashboard/screen.png`

## Commands
1. Generate app screenshots with Detox visual suites.
2. Sync latest screenshots:
```bash
npm run parity:stitch:sync-latest
```
This command selects the closest matching screenshot available in `artifacts/` for each mapped screen.
3. Run visual diff gate:
```bash
npm run parity:stitch:diff
```
4. One-shot:
```bash
npm run parity:stitch
```

## Expected Latest Screenshot Names
- `01-home.png` (required)
- `02-builder.png` (required)
- `03-active.png` (required)
- `04-complete.png` (required)
- `01b-songs.png` (optional)
- `01c-progress.png` (optional)

## Pass Rules
- Required screens must exist and stay below max diff ratio (`19%`).
- Optional screens are reported for visibility and do not fail the gate.
- Diff artifacts are written to `artifacts/stitch-parity/diff/`.

## Screen Checklist (manual signoff)
- Practice Hub: hierarchy, hero CTA prominence, goal/streak/XP readability.
- Songs & Library: featured challenge emphasis, search/filter clarity, row action readability.
- Build Your Chain: drill card readability, chain controls, no overlap/truncation defects.
- Practice Session: timer dominance, metronome strip clarity, cue readability.
- Session Summary: reward hierarchy, XP/streak focus, follow-up CTA clarity.
- Progress Dashboard: lane readability, milestone hierarchy, summary signal clarity.
