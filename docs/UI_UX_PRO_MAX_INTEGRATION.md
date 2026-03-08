# UI/UX Pro Max Integration (Fretline)

## Goal
Use `ui-ux-pro-max-skill` as a design reasoning assistant, then map output into Fretline-specific React Native constraints.

## Source
- Repository: `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- License: MIT
- Local analysis path used: `/tmp/ui-ux-pro-max-skill`

## Integration Decision
- Use: design system ideation + stack heuristics.
- Do not use directly: generated web-first tokens/components without adaptation.

## Why Adaptation Is Required
Raw generator output defaults to web/light patterns and generic categories that do not match:
1. Fretline dark analog visual direction.
2. Existing token contract in `App.tsx`.
3. Current e2e test/testID stability constraints.

## Working Workflow
1. Generate references:
- `python3 /tmp/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --design-system -f markdown`
- `python3 /tmp/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --stack react-native`
2. Normalize into Fretline system files:
- `docs/design-system/fretline/MASTER.md`
- `docs/design-system/fretline/pages/*.md`
3. Implement in small batches in app code.
4. Validate each batch with:
- `npm run check`
- target Detox suites for touched flows

## Stability Gates (Mandatory)
- Preserve existing UX behavior unless explicitly changed.
- Keep >=95% coverage policy intact.
- Keep iOS and Android stable.
- CI remains manual-only (`workflow_dispatch`) until credits are available.
