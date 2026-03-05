async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openBuilder() {
  await waitForVisible("home-start-practice");
  await element(by.id("home-start-practice")).tap();
  await waitForVisible("builder-screen");
}

async function ensureDrillExists() {
  const stats = await element(by.id("builder-stats")).getAttributes();
  const raw = String(stats.label ?? stats.text ?? stats.value ?? "");
  const match = raw.match(/(\d+)\s+drills/i);
  const drillCount = match ? Number(match[1]) : 0;
  if (drillCount === 0) {
    await element(by.id("builder-add-drill")).tap();
    await waitForVisible("builder-drill-count");
  }
}

async function completeBySkipping() {
  for (let i = 0; i < 20; i += 1) {
    try {
      await waitForVisible("complete-screen", 1000);
      return;
    } catch {
      await waitForVisible("active-skip-button", 6000);
      await element(by.id("active-skip-button")).tap();
    }
  }
  await waitForVisible("complete-screen", 15000);
}

async function startSessionFromBuilder() {
  await element(by.id("builder-start-session")).tap();

  try {
    await waitForVisible("active-screen");
  } catch (error) {
    try {
      const attrs = await element(by.id("builder-error-text")).getAttributes();
      const message = String(attrs.text ?? attrs.label ?? attrs.value ?? "unknown builder error");
      throw new Error(`Could not start session from builder: ${message}`);
    } catch {
      throw error;
    }
  }
}

describe("Visual state snapshots", () => {
  it("captures home, builder, active, and complete screens", async () => {
    await waitForVisible("home-start-practice");
    await device.takeScreenshot("01-home");

    await openBuilder();
    await ensureDrillExists();
    await device.takeScreenshot("02-builder");

    await startSessionFromBuilder();
    await device.takeScreenshot("03-active");

    await completeBySkipping();
    await waitForVisible("complete-screen");
    await device.takeScreenshot("04-complete");
  });
});
