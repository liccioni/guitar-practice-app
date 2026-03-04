# Release Plan (Current)

## Status
- Android: Active release track (internal distribution available).
- iOS: Store/TestFlight distribution blocked pending paid Apple Developer enrollment.

## Android Track (Active)
### Current build
- EAS build id: `b4cb9774-1ca3-4b3a-a2cb-9bdb94e543bb`
- Profile: `preview`
- Distribution: `internal`
- Artifact (APK): `https://expo.dev/artifacts/eas/ojSxXYtSYjCoSPPosJchFe.apk`
- Source commit used by build: `9a60988`

### Next actions
1. Install APK on test Android devices.
2. Execute smoke checklist:
- Home -> Start Practice -> Session Builder -> Start Session -> Session Complete
- Add/remove/reorder drills in builder
- Metronome toggle/BPM step
- Reminder toggle/time save
- Relaunch app and verify persisted local data
3. Log defects against `docs/BUG_REPORTS.md`.
4. Promote from `preview` to `production` Android profile after QA signoff.

## iOS Track (Blocked)
### Blocker
- Apple Developer team is unavailable (`no team associated with Apple account`).

### What still works without Apple paid account
- iOS simulator and local QA (`npm run ios:local`).
- UX and functionality development.
- CI iOS Detox coverage.

### What cannot be done until enrollment
- EAS iOS internal distribution (ad hoc/TestFlight path).
- App Store Connect/TestFlight release pipeline.

## Re-entry when Apple enrollment is ready
1. Run iOS build interactively:
```bash
npx eas-cli build --platform ios --profile preview
```
2. Complete Apple credential prompts.
3. Distribute internal iOS build and execute same smoke checklist.

