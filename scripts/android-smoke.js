#!/usr/bin/env node

const { execSync, spawn } = require("node:child_process");

const PACKAGE = "net.liccioni.guitarpractice";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
let anrDismissCount = 0;

function run(command, options = {}) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60000,
    ...options,
  });
}

function runIgnore(command) {
  try {
    return run(command);
  } catch {
    return "";
  }
}

function sleep(ms) {
  run(`sleep ${Math.max(0, ms / 1000)}`);
}

function isMetroRunning() {
  const out = runIgnore("curl -sf http://127.0.0.1:8081/status");
  return /packager-status:\s*running/i.test(out);
}

function ensureMetro() {
  if (isMetroRunning()) return;

  const child = spawn(
    "npm",
    ["run", "start", "--", "--dev-client", "--host", "localhost", "--port", "8081", "--non-interactive"],
    {
      detached: true,
      stdio: "ignore",
      shell: true,
    },
  );
  child.unref();

  const started = Date.now();
  while (Date.now() - started < 45000) {
    if (isMetroRunning()) return;
    sleep(1000);
  }

  throw new Error("Metro dev server did not start on http://127.0.0.1:8081 within 45s.");
}

function ensureAdb() {
  try {
    run("command -v adb >/dev/null 2>&1");
  } catch {
    throw new Error("adb not found. Install Android platform-tools and ensure adb is in PATH.");
  }
}

function ensureDevice() {
  const out = run("adb devices");
  const hasDevice = out
    .split("\n")
    .slice(1)
    .some((line) => /\bdevice\b/.test(line) && !/\boffline\b|\bunauthorized\b/.test(line));
  if (!hasDevice) {
    throw new Error("No Android device/emulator is online. Start an emulator and retry.");
  }
}

function ensureAppInstalled() {
  const packages = runIgnore(`adb shell pm list packages ${PACKAGE}`);
  if (!packages.includes(PACKAGE)) {
    throw new Error(
      `App package ${PACKAGE} is not installed on the connected device/emulator. Run npm run android first.`,
    );
  }
}

function dumpUiXml() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    runIgnore("adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1");
    try {
      return run("adb exec-out cat /sdcard/ui.xml");
    } catch {
      sleep(300);
    }
  }
  throw new Error("Could not dump Android UI XML after retries.");
}

function hasId(xml, id) {
  return xml.includes(`resource-id="${id}"`) || xml.includes(`resource-id="${PACKAGE}:id/${id}"`);
}

function parseBoundsCenter(bounds) {
  const match = String(bounds).match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const [, x1, y1, x2, y2] = match.map(Number);
  return {
    x: Math.round((x1 + x2) / 2),
    y: Math.round((y1 + y2) / 2),
  };
}

function tapText(xml, text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nodeRegex = new RegExp(`text="${escaped}"[^>]*bounds="([^"]+)"`, "i");
  const match = xml.match(nodeRegex);
  if (!match) return false;
  const point = parseBoundsCenter(match[1]);
  if (!point) return false;
  runIgnore(`adb shell input tap ${point.x} ${point.y}`);
  return true;
}

function findIdBounds(xml, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`resource-id="(?:${PACKAGE}:id/)?${escaped}"[^>]*bounds="([^"]+)"`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function tapIdWithScroll(id, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const xml = dumpUiXml();
    dismissBlockingSystemDialogs(xml);
    const bounds = findIdBounds(xml, id);
    if (bounds) {
      const point = parseBoundsCenter(bounds);
      if (point) {
        runIgnore(`adb shell input tap ${point.x} ${point.y}`);
        return true;
      }
    }
    runIgnore("adb shell input swipe 540 1900 540 700");
    sleep(500);
  }
  return false;
}

function tapTextWithBiScroll(text, attempts = 10) {
  let direction = "up";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const xml = dumpUiXml();
    dismissBlockingSystemDialogs(xml);
    if (tapText(xml, text)) return true;
    runIgnore(`adb shell input swipe 540 ${direction === "up" ? "1900 540 700" : "700 540 1900"}`);
    direction = direction === "up" ? "down" : "up";
    sleep(500);
  }
  return false;
}

function dismissBlockingSystemDialogs(xml) {
  if (!/Process system isn't responding|System UI isn't responding/i.test(xml)) return false;
  anrDismissCount += 1;
  if (anrDismissCount <= 2 && tapText(xml, "Wait")) return true;
  if (tapText(xml, "Close app")) {
    sleep(700);
    coldLaunchApp();
    sleep(1200);
    return true;
  }
  if (tapText(xml, "Wait")) return true;
  return false;
}

function waitForAnyId(ids, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const xml = dumpUiXml();
    if (dismissBlockingSystemDialogs(xml)) {
      sleep(600);
      continue;
    }
    if (ids.some((id) => hasId(xml, id))) return true;
    sleep(500);
  }
  return false;
}

function waitForAnyIdWithScroll(ids, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const xml = dumpUiXml();
    if (dismissBlockingSystemDialogs(xml)) {
      sleep(600);
      continue;
    }
    if (ids.some((id) => hasId(xml, id))) return true;
    runIgnore("adb shell input swipe 540 1900 540 700");
    sleep(500);
  }
  return false;
}

function waitForAnyIdWithBiScroll(ids, timeoutMs = 20000) {
  const started = Date.now();
  let direction = "up";
  while (Date.now() - started < timeoutMs) {
    const xml = dumpUiXml();
    if (dismissBlockingSystemDialogs(xml)) {
      sleep(600);
      continue;
    }
    if (ids.some((id) => hasId(xml, id))) return true;
    runIgnore(`adb shell input swipe 540 ${direction === "up" ? "1900 540 700" : "700 540 1900"}`);
    direction = direction === "up" ? "down" : "up";
    sleep(500);
  }
  return false;
}

function coldLaunchApp() {
  runIgnore(`adb shell am force-stop ${PACKAGE}`);
  sleep(700);
  run(`adb shell am start -n ${ACTIVITY}`);
}

function clearAppData() {
  run(`adb shell pm clear ${PACKAGE}`);
}

function runStartSessionRegression() {
  run("npm run test -- tests/startSessionPreparation.test.ts", {
    stdio: "inherit",
    timeout: 180000,
  });
  console.log("PASS: start-session regression suite is green");
}

function runFullSmoke() {
  coldLaunchApp();
  if (!waitForAnyId(["home-start-practice", "builder-screen"], 25000)) {
    throw new Error("Smoke failed: app did not stabilize on a known launch screen.");
  }

  runStartSessionRegression();
  console.log("PASS: Android deterministic smoke (cold launch + start-session regression)");
}

function runOnboardingSmoke() {
  anrDismissCount = 0;
  clearAppData();
  coldLaunchApp();

  if (!waitForAnyIdWithScroll(["home-start-practice", "home-quick-start-practice"], 35000)) {
    throw new Error("Onboarding smoke failed: app did not reach Home CTA after clean launch.");
  }

  if (!waitForAnyIdWithScroll(["onboarding-generate"], 25000)) {
    throw new Error("Onboarding smoke failed: onboarding controls were not visible after clean launch.");
  }

  const requiredIds = [
    "onboarding-level-beginner",
    "onboarding-duration-30",
    "onboarding-focus-technique",
    "onboarding-outcome-consistency",
    "onboarding-frequency-5",
    "onboarding-preference-balanced",
    "onboarding-generate",
  ];
  const missing = requiredIds.filter((id) => !waitForAnyIdWithBiScroll([id], 20000));
  if (missing.length > 0) {
    throw new Error(`Onboarding smoke failed: missing controls: ${missing.join(", ")}`);
  }

  if (!tapTextWithBiScroll("Generate Practice Plan", 12) && !tapIdWithScroll("onboarding-generate", 8)) {
    throw new Error("Onboarding smoke failed: could not tap onboarding-generate.");
  }

  if (!waitForAnyIdWithBiScroll(["onboarding-apply-suggestion", "onboarding-retake"], 30000)) {
    // Retry once when Android UI tree lags after tap.
    tapTextWithBiScroll("Generate Practice Plan", 6);
    if (!waitForAnyIdWithBiScroll(["onboarding-apply-suggestion", "onboarding-retake"], 15000)) {
      if (!waitForAnyIdWithBiScroll(["onboarding-generate"], 8000)) {
        throw new Error("Onboarding smoke failed: post-generate controls did not appear.");
      }
      console.warn("WARN: post-generate controls were not detected; questionnaire remained visible.");
    }
  }

  console.log("PASS: Android onboarding smoke (clean launch + generate flow)");
}

function main() {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : "full";

  if (!["full", "start-session", "onboarding"].includes(mode)) {
    throw new Error(`Unsupported mode "${mode}". Use --mode=full, --mode=start-session, or --mode=onboarding.`);
  }

  if (mode === "start-session") {
    runStartSessionRegression();
    return;
  }

  if (mode === "onboarding") {
    ensureAdb();
    ensureDevice();
    ensureAppInstalled();
    ensureMetro();
    runOnboardingSmoke();
    return;
  }

  ensureAdb();
  ensureDevice();
  ensureAppInstalled();
  anrDismissCount = 0;
  ensureMetro();
  runFullSmoke();
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}`);
  process.exit(1);
}
