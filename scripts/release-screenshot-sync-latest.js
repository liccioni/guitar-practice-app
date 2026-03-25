#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  ARTIFACTS_ROOT,
  RELEASE_LATEST_ROOT,
  RELEASE_SCREENSHOT_MAP,
  ROOT,
} = require("./release-screenshot-common");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function listArtifactRuns() {
  if (!fs.existsSync(ARTIFACTS_ROOT)) return [];
  return fs
    .readdirSync(ARTIFACTS_ROOT)
    .map((name) => path.join(ARTIFACTS_ROOT, name))
    .filter((entry) => fs.statSync(entry).isDirectory() && path.basename(entry).startsWith("ios.sim.debug."))
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

function writeManifest(manifestEntries) {
  const manifestJsonPath = path.join(RELEASE_LATEST_ROOT, "manifest.json");
  const manifestCsvPath = path.join(RELEASE_LATEST_ROOT, "manifest.csv");

  fs.writeFileSync(manifestJsonPath, `${JSON.stringify(manifestEntries, null, 2)}\n`);

  const rows = [
    "slot,label,category,export_name,source_name,artifact_path,note",
    ...manifestEntries.map((entry) =>
      [
        entry.slot,
        entry.label,
        entry.category,
        entry.exportName,
        entry.sourceName,
        entry.artifactPath,
        entry.note,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];

  fs.writeFileSync(manifestCsvPath, `${rows.join("\n")}\n`);
}

function main() {
  resetDir(RELEASE_LATEST_ROOT);

  const runs = listArtifactRuns();
  if (runs.length === 0) {
    console.error("No iOS Detox artifact runs found under artifacts/.");
    process.exit(1);
  }

  const missing = [];
  const manifestEntries = [];

  for (const [index, entry] of RELEASE_SCREENSHOT_MAP.entries()) {
    let found = null;
    for (const run of runs) {
      found = findFileRecursively(run, entry.sourceName);
      if (found) break;
    }

    if (!found) {
      missing.push(entry);
      continue;
    }

    const destination = path.join(RELEASE_LATEST_ROOT, entry.exportName);
    fs.copyFileSync(found, destination);

    manifestEntries.push({
      slot: index + 1,
      key: entry.key,
      label: entry.label,
      category: entry.category,
      exportName: entry.exportName,
      sourceName: entry.sourceName,
      artifactPath: path.relative(ROOT, found),
      note: entry.note,
    });
  }

  if (missing.length > 0) {
    console.error("Missing release screenshot inputs:");
    for (const entry of missing) {
      console.error(`- ${entry.sourceName} (${entry.label})`);
    }
    process.exit(1);
  }

  writeManifest(manifestEntries);

  console.log(`Exported ${manifestEntries.length} release screenshot(s) to ${path.relative(ROOT, RELEASE_LATEST_ROOT)}`);
  for (const entry of manifestEntries) {
    console.log(`- ${entry.slot}. ${entry.label}: ${entry.exportName}`);
  }
}

main();
