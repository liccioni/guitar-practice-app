# Visual Snapshot Manifest

This file defines the expected screenshot names produced by Detox visual suites.
Design intent reference for these states: `docs/design-import/stitch/stitch/*`.

## 1. Primary Flow Snapshots
Run:
```bash
npm run e2e:detox:visual:ios
```

Expected screenshots:
- `01-home`
- `02-builder`
- `02b-builder-random-cue-preview`
- `03-active`
- `04-complete`

## 2. Edge-State Snapshots
Run:
```bash
npm run e2e:detox:visual:edge:ios
```

Expected screenshots:
- `edge-01-builder-empty`
- `edge-02-builder-validation-error`
- `edge-03-active-paused`
- `edge-04-builder-long-name-layout`

## 3. Review Rule
- A visual run is considered valid only if every expected name above is present.
