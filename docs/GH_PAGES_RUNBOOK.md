# `gh-pages` Website Runbook

## Scope
- Static marketing site lives in `website/`.
- Deployment target is the `gh-pages` branch.
- CI remains disabled by design (no GitHub Actions credits).

## Local Preview
```bash
npm run site:preview
```

Open `http://localhost:4173`.

## Manual Deploy
```bash
npm run site:deploy:gh-pages
```

Optional custom commit message:
```bash
bash scripts/deploy-gh-pages.sh "feat(site): update hero and pricing copy"
```

## Deploy Script Behavior
- Fetches `origin/gh-pages` when available.
- Uses a temporary git worktree at `.tmp/gh-pages-worktree`.
- Replaces branch contents with files from `website/`.
- Adds `.nojekyll`.
- Commits and pushes `gh-pages`.

## Notes
- This workflow does not modify CI settings.
- Keep all site-only assets in `website/` to avoid accidental branch pollution.
