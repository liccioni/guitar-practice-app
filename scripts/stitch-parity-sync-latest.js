#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatchModule = require('pixelmatch');
const pixelmatch = pixelmatchModule.default || pixelmatchModule;
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

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function resizeToSize(img, width, height) {
  if (img.width === width && img.height === height) return img;

  const out = new PNG({ width, height });
  const xRatio = (img.width - 1) / Math.max(1, width - 1);
  const yRatio = (img.height - 1) / Math.max(1, height - 1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(img.width - 1, x0 + 1);
      const y1 = Math.min(img.height - 1, y0 + 1);
      const tx = srcX - x0;
      const ty = srcY - y0;
      const dstIdx = (y * width + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const p00 = img.data[(y0 * img.width + x0) * 4 + channel];
        const p10 = img.data[(y0 * img.width + x1) * 4 + channel];
        const p01 = img.data[(y1 * img.width + x0) * 4 + channel];
        const p11 = img.data[(y1 * img.width + x1) * 4 + channel];
        const top = p00 * (1 - tx) + p10 * tx;
        const bottom = p01 * (1 - tx) + p11 * tx;
        out.data[dstIdx + channel] = Math.round(top * (1 - ty) + bottom * ty);
      }
    }
  }

  return out;
}

function diffRatio(referencePath, candidatePath) {
  const ref = readPng(referencePath);
  const cur = resizeToSize(readPng(candidatePath), ref.width, ref.height);
  const { width, height } = ref;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(ref.data, cur.data, diff.data, width, height, {
    threshold: 0.12,
    includeAA: true,
  });
  return diffPixels / (width * height);
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
    const candidates = [];
    for (const run of runs) {
      const candidate = findFileRecursively(run, entry.latestName);
      if (candidate) candidates.push(candidate);
    }

    if (candidates.length === 0) {
      missing.push(entry);
      continue;
    }

    if (!fs.existsSync(entry.reference)) {
      missing.push(entry);
      continue;
    }

    // Prefer the newest screenshot from the newest artifact run to avoid stale
    // "best historical match" masking current UI regressions.
    const found = candidates[0];
    if (!found) {
      missing.push(entry);
      continue;
    }

    let latestRatio = Number.NaN;
    try {
      latestRatio = diffRatio(entry.reference, found);
    } catch {
      latestRatio = Number.NaN;
    }

    const outFile = path.join(LATEST_ROOT, entry.latestName);
    fs.copyFileSync(found, outFile);
    copied.push({ label: entry.label, from: found, to: outFile, latestRatio });
  }

  console.log(`Synced ${copied.length} screenshot(s) into ${LATEST_ROOT}`);
  for (const item of copied) {
    const ratioText = Number.isFinite(item.latestRatio)
      ? `${(item.latestRatio * 100).toFixed(2)}%`
      : "n/a";
    console.log(`- ${item.label}: ${path.relative(ROOT, item.from)} (latest diff ${ratioText})`);
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
