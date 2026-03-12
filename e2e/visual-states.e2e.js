async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
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
  for (let i = 0; i < 20; i += 1) {
    try {
      await waitForVisible("complete-continue-button", 1000);
      return;
    } catch {
      try {
        await waitForVisible("active-skip-button", 2500);
        await element(by.id("active-skip-button")).tap();
      } catch {
        await waitForVisible("active-screen", 10000);
      }
    }
  }
  await waitForVisible("complete-continue-button", 20000);
}

async function startSessionFromBuilder() {
  await ensureBuilderReady();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await element(by.id("builder-start-session")).tap();

    try {
      await waitForVisible("active-screen", 8000);
      return;
    } catch {
      try {
        await waitForVisible("active-pause-toggle", 1500);
        return;
      } catch {}

      try {
        const attrs = await element(by.id("builder-error-text")).getAttributes();
        const message = String(attrs.text ?? attrs.label ?? attrs.value ?? "unknown builder error");
        if (/no drills/i.test(message)) {
          await element(by.id("builder-add-drill")).tap();
          await waitForVisible("builder-drill-count");
          await ensureBuilderReady();
          continue;
        }
        throw new Error(`Could not start session from builder: ${message}`);
      } catch {
        // Continue retrying when transition is still in progress.
      }
    }
  }

  throw new Error("Could not start session from builder after retries.");
}

describe("Visual state snapshots", () => {
  it("captures home, builder, active, and complete screens", async () => {
    try {
      await waitForVisible("home-quick-start-practice", 60000);
    } catch {
      await waitForVisible("home-start-practice", 60000);
    }
    await device.takeScreenshot("01-home");

    await openBuilderFromHome();
    await ensureBuilderReady();

    await ensureDrillExists();
    await device.takeScreenshot("02-builder");

    await startSessionFromBuilder();
    await device.takeScreenshot("03-active");

    await completeBySkipping();
    await waitForVisible("complete-continue-button");
    await device.takeScreenshot("04-complete");
  });
});
