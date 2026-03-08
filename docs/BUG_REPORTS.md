# Bug Reports

## BR-2026-03-08-001 - Session Builder Drill Card XP Label Overlap

- Status: Fixed
- Date reported: 2026-03-08
- Area: Session Builder drill card layout (`App.tsx`)
- Severity: Medium (UI readability and edit affordance clarity)

### Symptom
In Session Builder drill cards, the XP label can overlap the drill title text (example observed: `58 XP` overlaps `Alternate Picking Burst`), causing clipping and reduced readability.

### Notes for future fix
- Update drill-card row layout to reserve fixed space for XP/actions.
- Ensure title text truncates safely (`numberOfLines`/ellipsize) before overlap.
- Add visual regression coverage for long drill names + XP badge in the same card.

### Fix
- Drill card layout was restructured to prevent title/XP overlap at narrow widths.
- XP badge placement was compacted and title truncation was hardened.
- Added edge visual regression assertion for compact title behavior.

### Verification
- `npm run check` passed.
- `npm run e2e:detox:test:ios -- e2e/visual-edge-states.e2e.js` passed.

## BR-2026-03-06-001 - Detox Remove Drill Control Flake (iOS Simulator)

- Status: Fixed
- Date reported: 2026-03-06
- Area: Detox e2e (`e2e/builder-smoke.e2e.js`)
- Severity: Medium (test reliability issue, no confirmed production crash)

### Symptom
In the iOS simulator, the smoke test step that removes a drill from Session Builder intermittently fails to interact with remove controls, causing unstable test outcomes.

### Fix
- Added deterministic builder control `builder-remove-first-control` in `SessionBuilder`.
- Updated smoke test remove path to use this deterministic control.
- Re-enabled remove-drill smoke test (removed temporary skip).

### Verification
- `npm run e2e:detox:ios` passed with all suites green.
- `Session builder e2e` now reports 4 passing tests (including remove drill).

## BR-2026-03-04-001 - Screen Transition Flicker on Screen Change

- Status: Fixed
- Date reported: 2026-03-04
- Area: UI transition system
- Severity: Medium (visible UX regression)

### Symptom
When changing between app screens (Home, Builder, Active, Complete), the user sees a visible flicker/flash.

### Root Cause
The global screen transition animation in `App.tsx` animated opacity with a full fade-out then fade-in (`1 -> 0 -> 1`) on every screen change. This briefly rendered the container fully transparent, producing a flash.

### Fix
Transition logic changed to a soft one-way fade-in only (`0.94 -> 1`), avoiding full transparency.

- File changed: `App.tsx`
- Behavior after fix: no full black/flash frame during screen transitions.

### Verification
- `npm run lint` passed.
- `npm run typecheck` passed.
- Manual validation: switching between screens no longer shows hard flicker.
