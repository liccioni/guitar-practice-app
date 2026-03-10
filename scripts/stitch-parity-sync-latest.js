#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { LATEST_ROOT, PARITY_MAP, ROOT } = require('./stitch-parity-common');

const ARTIFACTS_ROOT = path.join(ROOT, 'artifacts');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listArtifactRuns() {
  if (!fs.existsSync(ARTIFACTS_ROOT)) return [];
  return fs
    .readdirSync(ARTIFACTS_ROOT)
    .map((name) => path.join(ARTIFACTS_ROOT, name))
    .filter((p) => fs.statSync(p).isDirectory() && path.basename(p).startsWith('ios.sim.debug.'))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function findFileRecursively(dir, fileName) {
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === fileName) {
        return full;
      }
    }
  }
  return null;
}

function main() {
  ensureDir(LATEST_ROOT);
  const runs = listArtifactRuns();
  if (runs.length === 0) {
    console.error('No iOS Detox artifact runs found under artifacts/.');
    process.exit(1);
  }

  const missing = [];
  const copied = [];

  for (const entry of PARITY_MAP) {
    let found = null;
    for (const run of runs) {
      const candidate = findFileRecursively(run, entry.latestName);
      if (candidate) {
        found = candidate;
        break;
      }
    }

    if (!found) {
      missing.push(entry);
      continue;
    }

    const outFile = path.join(LATEST_ROOT, entry.latestName);
    fs.copyFileSync(found, outFile);
    copied.push({ label: entry.label, from: found, to: outFile });
  }

  console.log(`Synced ${copied.length} screenshot(s) into ${LATEST_ROOT}`);
  for (const item of copied) {
    console.log(`- ${item.label}: ${path.relative(ROOT, item.from)}`);
  }

  if (missing.length > 0) {
    console.log('Missing screenshots:');
    for (const item of missing) {
      const level = item.required ? 'required' : 'optional';
      console.log(`- ${item.latestName} (${item.label}, ${level})`);
    }
  }
}

main();
