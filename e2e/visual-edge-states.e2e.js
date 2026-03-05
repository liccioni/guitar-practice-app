async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openBuilder() {
  await waitForVisible("home-start-practice");
  await element(by.id("home-start-practice")).tap();
  await waitForVisible("builder-screen");
}

function parseDrillCount(rawValue) {
  const raw = String(rawValue ?? "");
  const match = raw.match(/(\d+)\s+drills/i);
  return match ? Number(match[1]) : 0;
}

async function getDrillCount() {
  const attrs = await element(by.id("builder-stats")).getAttributes();
  return parseDrillCount(attrs.label ?? attrs.text ?? attrs.value);
}

async function removeAllDrills(maxRemovals = 20) {
  for (let i = 0; i < maxRemovals; i += 1) {
    const count = await getDrillCount();
    if (count <= 0) return;
    await waitFor(element(by.text("Remove")).atIndex(0)).toBeVisible().withTimeout(5000);
    await element(by.text("Remove")).atIndex(0).tap();
  }
}

async function ensureAtLeastOneDrill() {
  const count = await getDrillCount();
  if (count === 0) {
    await element(by.id("builder-add-drill")).tap();
    await waitForVisible("builder-drill-count");
  }
}

async function startSession() {
  await element(by.id("builder-start-session")).tap();
  await waitForVisible("active-screen");
}

describe("Visual edge state snapshots", () => {
  it("captures empty builder, validation, and paused active states", async () => {
    await openBuilder();

    await removeAllDrills();
    await waitForVisible("builder-empty-title");
    await device.takeScreenshot("edge-01-builder-empty");

    await element(by.id("builder-start-session")).tap();
    await waitForVisible("builder-error-text");
    await device.takeScreenshot("edge-02-builder-validation-error");

    await ensureAtLeastOneDrill();
    await startSession();
    await waitForVisible("active-pause-toggle");
    await element(by.id("active-pause-toggle")).tap();
    await device.takeScreenshot("edge-03-active-paused");
  });
});
