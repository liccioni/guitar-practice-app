# Release Screenshot Pipeline

This is the repeatable path for generating the core Fretline screenshots used for app-store listing and launch materials.

## Goal

Produce a stable set of polished screenshots without manually hunting screens in the simulator.

## Core Capture Set

The current release set is:

1. `01-practice-hub.png`
2. `02-progress-dashboard.png`
3. `03-profile-setup.png`
4. `04-session-builder.png`
5. `05-active-practice.png`
6. `06-session-complete.png`

These are exported from the current Detox visual snapshot flow and written to:

- `artifacts/release-screenshots/latest/`

The export also writes:

- `artifacts/release-screenshots/latest/manifest.json`
- `artifacts/release-screenshots/latest/manifest.csv`

## Commands

Run the full iOS screenshot pipeline:

```bash
npm run screenshots:release:ios
```

This does two things:

1. runs the Detox visual snapshot suite
2. copies the latest release-ready captures into `artifacts/release-screenshots/latest/`

If the latest visual snapshot run already exists and you only want to rebuild the release export:

```bash
npm run screenshots:release:sync
```

## Source Mapping

The release export currently maps these visual captures:

- `01-home.png` -> `01-practice-hub.png`
- `01c-progress.png` -> `02-progress-dashboard.png`
- `01d-profile.png` -> `03-profile-setup.png`
- `02-builder.png` -> `04-session-builder.png`
- `03-active.png` -> `05-active-practice.png`
- `04-complete.png` -> `06-session-complete.png`

## Output Expectations

- the export should fail if any required release screenshot is missing
- the latest run should always overwrite the previous contents of `artifacts/release-screenshots/latest/`
- the manifest should make it obvious which artifact run each exported screenshot came from

## Current Limits

- this is currently iOS-only
- the pipeline exports raw device screenshots, not store-formatted marketing composites
- localized store variants still need future work if launch requires them
