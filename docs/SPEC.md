# Fretline Spec (Minimal)

## Product Scope
- iOS + Android via Expo React Native.
- Local-only persistence (no backend).
- Dark, musician-first UI.

## Required User Flow
1. Home (practice hub, goals, streak, XP).
2. Sessions/Builder (create/edit routines, add/remove/reorder drills, inline autosave).
3. Active Practice (timer, metronome, optional random cues).
4. Session Complete (XP/streak reward moment).
5. Songs, Progress, Profile views available from tabs.

## Key Rules
- Drill name required.
- Duration: 1-30 min.
- BPM (if set): 40-240.
- Random cue interval (if enabled): 1-16 bars.
- Session start requires valid template.

## Stability Contract
- `npm run check` must pass.
- Coverage threshold: >=95% (global and per-file, enforced by Vitest config).
- CI remains manual-only until credits are available.

## Stable Reference
- Stable tag: `stable-2026-03-10-stitch-flow-batchc-green`
- Stable commit: `2a09696`
