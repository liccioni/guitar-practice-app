# Session Builder Override

## Purpose
Assemble a playable drill chain quickly, not a CRUD table.

## Primary Action
- `Start This Session`

## Layout Rules
- Top: template controls (new/duplicate/save/delete)
- Middle: reorderable drill list with tactile rows
- Bottom: sticky start CTA, then secondary edit actions

## Drill Row Priority
1. Drill title (max readability)
2. Duration + BPM
3. XP
4. Reorder controls
5. Remove

## Required Interaction
- Tap row to edit drill.
- Reorder via dedicated controls (current behavior) with future drag support optional.
- Keep `builder-remove-first-control` and reorder test IDs stable.

## Remove From UI
- Any debug-feeling actions in primary path.
- Duplicate low-value controls near main CTA.
