# Guitar Practice App

Mobile guitar practice coach app (dark mode, gamified UX) built with Expo + TypeScript, with spec-driven docs in `docs/`.

## Current Status
- UI checkpoint is focused on gamified UX flow (Home, Builder, Active, Complete).
- Feature parity recovery restored metronome controls and local history/goals/reminders wiring.
- Remaining functional gaps are concentrated in validation UX breadth and final production hardening.

## App Identity
- iOS bundle identifier: `net.liccioni.guitarpractice`
- Android package: `net.liccioni.guitarpractice`

## Quick Start
1. Install dependencies (already installed by scaffold): `npm install`
2. Run iOS simulator (stable localhost mode): `npm run ios:local`
3. Or start Expo normally: `npm run start`
4. Test on phone with Expo Go by scanning the QR code.

## Build Profiles
EAS profiles are defined in `eas.json`:
- `development`
- `preview`
- `production`

## Quality Gate
- Run full release-candidate checks: `npm run check`

## Documentation
- Product spec: `docs/SPEC.md`
- Spec/code alignment checklist: `docs/SPEC_ALIGNMENT.md`
- Phase 4 verification: `docs/PHASE4_VERIFICATION.md`
- Acceptance criteria: `docs/ACCEPTANCE_CRITERIA.md`
- Implementation plan: `docs/PLAN.md`
- Progress tracking: `docs/PROGRESS.md`
- Audit checklist: `docs/AUDIT_CHECKLIST.md`
- Release notes: `docs/RELEASE_NOTES.md`
