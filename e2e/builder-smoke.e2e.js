async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openBuilderScreen() {
  let usedQuickAction = false;
  try {
    await waitForVisible("home-quick-start-practice", 60000);
    await element(by.id("home-quick-start-practice")).tap();
    usedQuickAction = true;
  } catch {
    // Fallback to primary practice CTA.
  }

  if (!usedQuickAction) {
    await waitForVisible("home-start-practice", 60000);
    await element(by.id("home-start-practice")).tap();
  } else {
    try {
      // Legacy flow: quick action opens builder directly.
      await waitForVisible("builder-start-session", 5000);
      return;
    } catch {
      // Current flow: quick action opens Sessions list. Jump into first builder preset.
      try {
        await waitFor(element(by.text("Open Builder")).atIndex(0)).toBeVisible().withTimeout(12000);
        await element(by.text("Open Builder")).atIndex(0).tap();
      } catch {
        // If sessions entry is unavailable, fallback to primary CTA.
        await waitForVisible("home-start-practice", 12000);
        await element(by.id("home-start-practice")).tap();
      }
    }
  }
  await waitForVisible("builder-start-session", 30000);
}

function parseStats(value) {
  const text = String(value ?? "");
  const match = text.match(/(\d+)\s+drill/i);
  if (!match) {
    throw new Error(`Could not parse builder stats from: ${text}`);
  }
  return {
    drillCount: Number(match[1]),
  };
}

async function getBuilderStats() {
  const attrs = await element(by.id("builder-drill-count")).getAttributes();
  const raw = attrs.text ?? attrs.label ?? attrs.value;
  return parseStats(raw);
}

async function waitForDrillCount(targetCount, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stats = await getBuilderStats();
    if (stats.drillCount === targetCount) {
      return stats;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for drill count ${targetCount}`);
}

async function expectDrillCardsVisible() {
  await waitForVisible("builder-drill-card-first", 12000);
}

async function getFirstDrillId() {
  const attrs = await element(by.id("builder-drill-first-id-probe")).getAttributes();
  return String(attrs.label ?? attrs.text ?? attrs.value ?? "");
}

async function getSecondDrillId() {
  const attrs = await element(by.id("builder-drill-second-id-probe")).getAttributes();
  return String(attrs.label ?? attrs.text ?? attrs.value ?? "");
}

async function waitForFirstDrillIdChange(previousId, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const current = await getFirstDrillId();
      if (current.length > 0 && current !== previousId) {
        return current;
      }
    } catch {
      // List can virtualize while we swipe; keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for first drill id to change after move-down action.");
}

async function dragFirstDrillBelowSecond() {
  await waitForVisible("builder-drag-first-handle", 5000);
  const secondId = await getSecondDrillId();
  if (!secondId) {
    throw new Error("Could not determine second drill id for drag target.");
  }

  await element(by.id("builder-drag-first-handle")).longPressAndDrag(
    1200,
    NaN,
    NaN,
    element(by.id(`builder-drill-card-${secondId}`)),
    NaN,
    NaN,
    "fast",
    0,
  );
}

async function createFreshTemplate() {
  await waitForVisible("builder-template-new", 8000);
  await element(by.id("builder-template-new")).tap();
  const stats = await getBuilderStats();
  if (stats.drillCount <= 0) {
    throw new Error("New template did not create drills");
  }
  await expectDrillCardsVisible();
}

async function startSessionFromBuilder() {
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
        const errorMessage = String(attrs.text ?? attrs.label ?? attrs.value ?? "unknown builder error");
        if (/no drills/i.test(errorMessage)) {
          await element(by.id("builder-add-drill")).tap();
          await waitForVisible("builder-drill-count", 8000);
          continue;
        }
        throw new Error(`Session did not start. Builder error: ${errorMessage}`);
      } catch {
        // Continue retrying when UI is mid-transition.
      }
    }
  }

  throw new Error("Could not start session from builder after retries.");
}

async function removeOneDrill() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await waitForVisible("builder-remove-first-control", 2000);
      await element(by.id("builder-remove-first-control")).tap();
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return false;
}

describe("Session builder e2e", () => {
  it("adds a drill when tapping Add Drill", async () => {
    await openBuilderScreen();
    await createFreshTemplate();

    const before = await getBuilderStats();
    await element(by.id("builder-add-drill")).tap();
    await waitForDrillCount(before.drillCount + 1, 10000);
    await expectDrillCardsVisible();
  });

  it("removes a drill when tapping Remove", async () => {
    await openBuilderScreen();
    await createFreshTemplate();

    const current = await getBuilderStats();
    const removed = await removeOneDrill();
    if (!removed) {
      throw new Error("Could not remove a drill from builder.");
    }
    await waitForDrillCount(Math.max(0, current.drillCount - 1), 10000);
  });

  it("starts a session from builder", async () => {
    await openBuilderScreen();
    await startSessionFromBuilder();
  });

  it("reorders drills when moving first drill down", async () => {
    await openBuilderScreen();
    await createFreshTemplate();

    const stats = await getBuilderStats();
    if (stats.drillCount < 2) {
      await element(by.id("builder-add-drill")).tap();
      await waitForDrillCount(2, 10000);
    }

    const firstBefore = await getFirstDrillId();
    await dragFirstDrillBelowSecond();
    await waitForFirstDrillIdChange(firstBefore, 8000);
  });

  it("completes a session by skipping drills", async () => {
    await openBuilderScreen();
    await startSessionFromBuilder();

    let completed = false;
    for (let i = 0; i < 20; i += 1) {
      try {
        await waitForVisible("complete-continue-button", 1000);
        completed = true;
        break;
      } catch {
        try {
          await waitForVisible("active-skip-button", 2500);
          await element(by.id("active-skip-button")).tap();
        } catch {
          await waitForVisible("active-screen", 10000);
        }
      }
    }

    if (!completed) {
      await waitForVisible("complete-continue-button", 20000);
    }

    await waitForVisible("complete-continue-button", 10000);
  });

  it("shows template name validation for short names", async () => {
    await openBuilderScreen();
    await createFreshTemplate();

    await element(by.id("builder-template-name-input")).replaceText("ab");
    await waitForVisible("builder-template-name-validation", 5000);
  });

});
