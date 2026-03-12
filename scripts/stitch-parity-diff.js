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

function fitToSameSize(a, b) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);

  const crop = (img) => {
    const out = new PNG({ width, height });
    PNG.bitblt(img, out, 0, 0, width, height, 0, 0);
    return out;
  };

  return [crop(a), crop(b), width, height];
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

    const refPng = readPng(item.reference);
    const latestPng = readPng(latest);
    const [ref, cur, width, height] = fitToSameSize(refPng, latestPng);

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
