#!/usr/bin/env node

const { execSync } = require("node:child_process");

const PACKAGE = "net.liccioni.guitarpractice";
const ACTIVITY = `${PACKAGE}/.MainActivity`;

function run(command, options = {}) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20000,
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

function dumpUiXml() {
  runIgnore("adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1");
  return run("adb exec-out cat /sdcard/ui.xml");
}

function hasId(xml, id) {
  return xml.includes(`resource-id="${id}"`);
}

function waitForAnyId(ids, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const xml = dumpUiXml();
    if (ids.some((id) => hasId(xml, id))) return true;
    sleep(500);
  }
  return false;
}

function coldLaunchApp() {
  runIgnore(`adb shell am force-stop ${PACKAGE}`);
  sleep(700);
  run(`adb shell am start -n ${ACTIVITY}`);
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

function main() {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : "full";

  if (!["full", "start-session"].includes(mode)) {
    throw new Error(`Unsupported mode "${mode}". Use --mode=full or --mode=start-session.`);
  }

  if (mode === "start-session") {
    runStartSessionRegression();
    return;
  }

  ensureAdb();
  ensureDevice();
  runFullSmoke();
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}`);
  process.exit(1);
}
