async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function isPresent(id) {
  try {
    await element(by.id(id)).getAttributes();
    return true;
  } catch {
    return false;
  }
}

async function openBuilderFromHome() {
  let usedQuickAction = false;
  try {
    await waitForVisible("home-quick-start-practice", 3000);
    await element(by.id("home-quick-start-practice")).tap();
    usedQuickAction = true;
  } catch {}

  if (!usedQuickAction) {
    await waitForVisible("home-start-practice", 8000);
    await element(by.id("home-start-practice")).tap();
    return;
  }

  try {
    await waitForVisible("builder-start-session", 5000);
    return;
  } catch {
    await waitFor(element(by.text("Open Builder")).atIndex(0)).toBeVisible().withTimeout(12000);
    await element(by.text("Open Builder")).atIndex(0).tap();
  }
}

async function ensureBuilderReady() {
  try {
    await waitForVisible("builder-start-session", 10000);
    return;
  } catch {}

  await waitFor(element(by.text("Open Builder")).atIndex(0)).toBeVisible().withTimeout(12000);
  await element(by.text("Open Builder")).atIndex(0).tap();
  await waitForVisible("builder-start-session", 16000);
}

async function ensureDrillExists() {
  const countLabel = await element(by.id("builder-drill-count")).getAttributes();
  const raw = String(countLabel.text ?? countLabel.label ?? countLabel.value ?? "");
  const match = raw.match(/(\d+)\s+drill/i);
  const drillCount = match ? Number(match[1]) : 0;
  if (drillCount === 0) {
    await element(by.id("builder-add-drill")).tap();
    await waitForVisible("builder-drill-count");
  }
  await waitForVisible("builder-drill-card-first", 12000);
}

async function getFirstDrillId() {
  const attrs = await element(by.id("builder-drill-first-id-probe")).getAttributes();
  return String(attrs.label ?? attrs.text ?? attrs.value ?? "");
}

async function completeBySkipping() {
  if (await isPresent("active-force-complete")) {
    await element(by.id("active-force-complete")).tap();
  }

  for (let i = 0; i < 60; i += 1) {
    if (await isPresent("complete-continue-button")) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for complete screen after skipping drills.");
}

async function openTab(id, destinationTestId) {
  await waitForVisible(`tab-${id}`, 12000);
  await element(by.id(`tab-${id}`)).tap();
  await waitForVisible(destinationTestId, 12000);
}

async function focusBuilderStartControl() {
  try {
    await waitForVisible("builder-start-session-control", 5000);
    return "builder";
  } catch {}

  await waitForVisible("overview-screen", 5000);
  return "overview";
}

async function startSessionFromOverview() {
  await waitForVisible("overview-screen", 8000);
  await waitForVisible("overview-start-session", 8000);
  await element(by.id("overview-start-session")).tap();
}

async function startSessionFromBuilder() {
  await ensureBuilderReady();
  const startSurface = await focusBuilderStartControl();
  if (startSurface === "builder") {
    await element(by.id("builder-start-session-control")).tap();
  } else {
    await startSessionFromOverview();
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (await isPresent("active-screen")) {
      return;
    }

    if (await isPresent("active-pause-toggle")) {
      return;
    }

    if (await isPresent("overview-screen")) {
      await startSessionFromOverview();
      continue;
    }

    try {
      const attrs = await element(by.id("builder-error-text")).getAttributes();
      const message = String(attrs.text ?? attrs.label ?? attrs.value ?? "unknown builder error");
      if (/no drills/i.test(message)) {
        await element(by.id("builder-add-drill")).tap();
        await waitForVisible("builder-drill-count");
        await element(by.id("builder-start-session-control")).tap();
        continue;
      }
      throw new Error(`Could not start session from builder: ${message}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Could not start session from builder:")) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Could not start session from builder after waiting for active practice.");
}

describe("Visual state snapshots", () => {
  it("captures home, progress, profile, builder, active, and complete screens", async () => {
    try {
      await waitForVisible("home-quick-start-practice", 60000);
    } catch {
      await waitForVisible("home-start-practice", 60000);
    }
    await device.takeScreenshot("01-home");

    await openTab("progress", "progress-screen");
    await device.takeScreenshot("01c-progress");

    await openTab("profile", "profile-screen");
    await device.takeScreenshot("01d-profile");

    await openTab("home", "home-scroll");

    await openBuilderFromHome();
    await ensureBuilderReady();

    await ensureDrillExists();
    await device.takeScreenshot("02-builder");

    await device.disableSynchronization();
    await startSessionFromBuilder();
    await device.takeScreenshot("03-active");

    await completeBySkipping();
    await device.takeScreenshot("04-complete");
    await device.enableSynchronization();
  });
});
