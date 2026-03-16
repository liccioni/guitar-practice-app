# Release Configuration

This document captures the release-facing metadata and operational configuration needed to package Fretline for App Store and Play Store submission.

It is intentionally practical. Use it as the source of truth before cutting a production build.

## Source Of Truth

### Expo App Metadata

Primary config:
- [app.json](/Users/liccioni/CodexProjects/fretline/app.json)

Current release-facing values:
- product name: `Fretline`
- expo slug: `guitar-practice-app`
- URL scheme: `fretline`
- version: `1.0.0`
- iOS build number: `1`
- Android version code: `1`
- iOS bundle identifier: `net.liccioni.guitarpractice`
- Android package: `net.liccioni.guitarpractice`
- orientation: `portrait`
- interface style: `dark`

Asset references:
- app icon: `assets/icon.png`
- splash image: `assets/splash-icon.png`
- Android adaptive icon: `assets/adaptive-icon.png`
- web favicon: `assets/favicon.png`

### EAS Build And Submit Profiles

Build/submit config:
- [eas.json](/Users/liccioni/CodexProjects/fretline/eas.json)

Current profiles:
- `development`: internal development client
- `preview`: internal distribution
- `production`: auto-increment enabled for release builds
- `submit.production`: reserved for store submission

## Release Commands

Quality and smoke gates:

```bash
npm run check
npm run e2e:maestro:ios
npm run e2e:android:smoke
```

Device QA:
- [docs/DEVICE_QA_CHECKLIST.md](/Users/liccioni/CodexProjects/fretline/docs/DEVICE_QA_CHECKLIST.md)

Build preparation:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

Submission preparation:

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## Release Checklist

### Config Validation

Confirm before each release:
- `app.json` version matches the intended public release version
- iOS build number and Android version code are ready for the next submission
- bundle/package identifiers still match the intended store apps
- icon and splash assets are final and not placeholder artwork

### Store Metadata Still Needed Outside The Repo

These are required for submission but are not fully represented in code:
- App Store subtitle
- App Store promotional text
- App Store keywords
- App Store support URL
- App Store marketing URL, if used
- privacy policy URL for both stores
- Play Store short description
- Play Store full description
- store listing screenshots and feature graphics
- age/content rating answers

### Operational Submission Notes

- iOS release builds should use real signing credentials, not local debug defaults
- Android release builds need a real release keystore and signing path in the EAS-managed flow
- release screenshots should come from the current smoke/visual pipeline, not manual ad hoc captures
- if the visible product name changes again, update both `app.json` and user-facing reminder copy together

## Known Intentional Gaps

These are currently acceptable, but should stay explicit:
- the Expo slug remains `guitar-practice-app` to preserve project continuity
- the bundle identifier/package name still use the older `guitarpractice` naming
- store listing text and legal URLs are still manual launch inputs, not repo-managed assets

## Related Docs

- [README.md](/Users/liccioni/CodexProjects/fretline/README.md)
- [docs/PROJECT_RUNBOOK.md](/Users/liccioni/CodexProjects/fretline/docs/PROJECT_RUNBOOK.md)
- [docs/DEVICE_QA_CHECKLIST.md](/Users/liccioni/CodexProjects/fretline/docs/DEVICE_QA_CHECKLIST.md)
