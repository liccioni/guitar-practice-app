#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatchModule = require('pixelmatch');
const pixelmatch = pixelmatchModule.default || pixelmatchModule;
const { DIFF_ROOT, LATEST_ROOT, PARITY_MAP } = require('./stitch-parity-common');

const THRESHOLD = 0.12;
const MAX_DIFF_RATIO_REQUIRED = 0.19;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

function main() {
  ensureDir(DIFF_ROOT);

  const results = [];
  let hardFail = false;

  for (const item of PARITY_MAP) {
    const latest = path.join(LATEST_ROOT, item.latestName);

    if (!fs.existsSync(item.reference)) {
      results.push({ item, status: 'missing-reference' });
      if (item.required) hardFail = true;
      continue;
    }

    if (!fs.existsSync(latest)) {
      results.push({ item, status: 'missing-latest' });
      if (item.required) hardFail = true;
      continue;
    }

    const ref = readPng(item.reference);
    const cur = resizeToSize(readPng(latest), ref.width, ref.height);
    const { width, height } = ref;

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(ref.data, cur.data, diff.data, width, height, {
      threshold: THRESHOLD,
      includeAA: true,
    });

    const totalPixels = width * height;
    const diffRatio = totalPixels === 0 ? 1 : diffPixels / totalPixels;
    const outDiff = path.join(DIFF_ROOT, `${item.key}-diff.png`);
    fs.writeFileSync(outDiff, PNG.sync.write(diff));

    const passRequired = diffRatio <= MAX_DIFF_RATIO_REQUIRED;
    if (item.required && !passRequired) hardFail = true;

    const status = item.required ? (passRequired ? 'pass' : 'fail') : 'info';
    results.push({ item, status, diffRatio, outDiff, width, height });
  }

  console.log('Stitch parity diff report');
  console.log(`- threshold: ${THRESHOLD}`);
  console.log(`- required max diff ratio: ${MAX_DIFF_RATIO_REQUIRED}`);

  for (const row of results) {
    if (row.status === 'missing-reference') {
      console.log(`- ${row.item.label}: MISSING REFERENCE (${row.item.reference})`);
      continue;
    }
    if (row.status === 'missing-latest') {
      const level = row.item.required ? 'REQUIRED' : 'OPTIONAL';
      console.log(`- ${row.item.label}: MISSING LATEST (${level}, ${row.item.latestName})`);
      continue;
    }

    const pct = (row.diffRatio * 100).toFixed(2);
    const mark =
      row.status === 'pass' ? 'PASS' :
      row.status === 'fail' ? 'FAIL' : 'INFO';
    const suffix = row.item.required ? 'required' : 'optional';
    console.log(`- ${row.item.label}: ${mark} [${suffix}] (diff ${pct}%, ${row.width}x${row.height}) -> ${row.outDiff}`);
  }

  if (hardFail) {
    process.exit(1);
  }
}

main();
