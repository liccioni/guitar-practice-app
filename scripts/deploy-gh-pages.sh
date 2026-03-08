#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
SITE_DIR="$ROOT_DIR/website"
WORKTREE_DIR="$ROOT_DIR/.tmp/gh-pages-worktree"
MESSAGE="${1:-chore(site): deploy gh-pages snapshot}"

if [[ ! -d "$SITE_DIR" ]]; then
  echo "Missing website directory: $SITE_DIR"
  exit 1
fi

mkdir -p "$ROOT_DIR/.tmp"
git fetch origin gh-pages >/dev/null 2>&1 || true

if [[ -d "$WORKTREE_DIR" ]]; then
  git worktree remove "$WORKTREE_DIR" --force
fi

if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  git worktree add -B gh-pages "$WORKTREE_DIR" origin/gh-pages
else
  git worktree add -B gh-pages "$WORKTREE_DIR"
fi

find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name ".git" -exec rm -rf {} +
cp -R "$SITE_DIR"/. "$WORKTREE_DIR"/
touch "$WORKTREE_DIR/.nojekyll"

pushd "$WORKTREE_DIR" >/dev/null
git add .
if git diff --cached --quiet; then
  echo "No gh-pages changes to deploy."
  popd >/dev/null
  git worktree remove "$WORKTREE_DIR" --force
  exit 0
fi
git commit -m "$MESSAGE"
git push origin gh-pages
popd >/dev/null

git worktree remove "$WORKTREE_DIR" --force
echo "gh-pages updated from $SITE_DIR"
