# Release Captain Checklist

Use this as the final operational checklist before cutting and submitting a production release.

It assumes the backlog is clear and the current release candidate is already merged to `main`.

## 1. Start From The Right Branch

Confirm you are on the merged release candidate, not an old feature branch:

```bash
git checkout main
git pull --ff-only
git status
```

Pass condition:
- `main` is up to date with `origin/main`
- the worktree is clean

## 2. Run The Required Gates

Run these in order:

```bash
npm run check
npm run e2e:maestro:ios
npm run e2e:android:smoke
```

Pass condition:
- repo check passes
- iOS Maestro smoke passes
- Android smoke passes on a real emulator or device session

If Android smoke cannot run because no emulator or device is online, the release is not fully validated yet.

Important:
- for the final merged release candidate, keep `npm run e2e:maestro:ios` as the required iOS gate
- `npm run e2e:maestro:rerun:ios` is a safe speed-up only for repeated branch-level reruns after a fresh successful native prepare on the same simulator/app state

## 3. Confirm Store Assets And Screenshots

Use the current screenshot pipeline output:

- [docs/RELEASE_SCREENSHOT_PIPELINE.md](/Users/liccioni/CodexProjects/fretline/docs/RELEASE_SCREENSHOT_PIPELINE.md)
- [artifacts/release-screenshots/latest](/Users/liccioni/CodexProjects/fretline/artifacts/release-screenshots/latest)

Confirm:
- the exported screenshots reflect the current app state
- the six core screenshots are present
- any required store feature graphics or marketing composites are ready outside the repo if needed

Pass condition:
- store screenshots are current and ready to upload

## 4. Finalize Store Metadata

These values still need to be prepared outside source control:

- App Store subtitle
- App Store promotional text
- App Store keywords
- App Store support URL
- App Store marketing URL, if used
- privacy policy URL
- Play Store short description
- Play Store full description
- age/content rating answers

Pass condition:
- all store listing text and legal URLs are ready before submission starts

## 5. Confirm Release Identity

Review:
- [app.json](/Users/liccioni/CodexProjects/fretline/app.json)
- [docs/RELEASE_CONFIGURATION.md](/Users/liccioni/CodexProjects/fretline/docs/RELEASE_CONFIGURATION.md)

Confirm:
- app version is correct
- iOS build number is ready
- Android version code is ready
- bundle/package identifiers still match the intended store apps
- the current naming decisions are intentional

Current intentional carry-forwards:
- Expo slug remains `guitar-practice-app`
- bundle/package identifiers remain `net.liccioni.guitarpractice`

Pass condition:
- versioning and identifiers match the release plan

## 6. Build The Release Artifacts

Run:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

Confirm:
- iOS signing is correct
- Android signing is correct
- build artifacts complete successfully in EAS

Pass condition:
- both production builds finish without signing or packaging errors

## 7. Submit To Stores

Run:

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Confirm during submission:
- store metadata matches the intended release
- screenshots and listing assets are attached correctly
- ratings and legal fields are complete

Pass condition:
- both submissions are accepted by App Store Connect and Play Console without missing-field errors

## 8. Final Release Record

Record the release outcome in:
- release notes or changelog location used by the project
- internal launch notes if needed

Capture:
- version released
- build numbers submitted
- screenshot artifact run used
- any known post-launch watch items

Pass condition:
- there is a short written record of what was shipped
