# Bug Reports

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

