# Release Notes

## Stable Baseline
- Tag: `stable-2026-03-04-ci-green`
- Commit: `fbca806`
- Release: `https://github.com/liccioni/guitar-practice-app/releases/tag/stable-2026-03-04-ci-green`

This baseline represents a known-good state with:
- CI quality job passing (lint, typecheck, unit/integration coverage)
- CI iOS Detox job passing
- Deterministic Session Builder e2e coverage (4 core user-path tests)

## Major Milestones Leading to Stable Baseline
1. `02a0dbd` - Stabilized iOS e2e pipeline and script patching.
2. `c28bf2c` - Deterministic Builder/Session Detox coverage.
3. `9a6ed6c` - Added GitHub Actions CI (quality + iOS Detox).
4. `e76f279` - CI prebuild before Detox build.
5. `4f9fcce` - Initial iOS CI hardening (Xcode/CocoaPods/pods install).
6. `e26202f` - Moved to newer Xcode in CI for Podfile compatibility.
7. `b609150` - Expo lint dependency alignment + expanded logic tests.
8. `331bed7` - Pinned Expo iOS deployment target to 17.0.
9. `c183e8e` - Enforced deployment target/SDK normalization in generated native files.
10. `9ec7d28` - Stabilized CI SDK selection and normalized SDKROOT handling.
11. `fbca806` - Added Detox framework cache refresh in CI.

## Current Branch Position
After the stable tag, branch `main` may include additional CI hardening commits. Use the tag if you need the exact frozen baseline.

## Post-Tag Fixes
1. Screen transition flicker fix (`App.tsx`)
- Root cause: full fade-out/in animation on screen changes caused visible flashing.
- Resolution: switched to soft one-way fade-in transition.
- Bug reference: `docs/BUG_REPORTS.md` -> `BR-2026-03-04-001`.
