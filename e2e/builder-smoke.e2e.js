async function openBuilderScreen() {
  try {
    await waitFor(element(by.id("home-start-practice"))).toBeVisible().withTimeout(12000);
    await element(by.id("home-start-practice")).tap();
  } catch {
    try {
      await waitFor(element(by.text("Start Practice"))).toBeVisible().withTimeout(12000);
      await element(by.text("Start Practice")).tap();
    } catch {
      // Already on builder.
    }
  }

  await waitFor(element(by.id("builder-start-session"))).toBeVisible().withTimeout(12000);
}

function parseStats(value) {
  const text = String(value ?? "");
  const match = text.match(/(\d+)\s+drills\s+(\d+)\s+xp/i);
  if (!match) {
    throw new Error(`Could not parse builder stats from: ${text}`);
  }
  return {
    drillCount: Number(match[1]),
    xp: Number(match[2]),
  };
}

async function getBuilderStats() {
  const attrs = await element(by.id("builder-stats")).getAttributes();
  const raw = attrs.label ?? attrs.text ?? attrs.value;
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

async function createFreshTemplate() {
  await waitFor(element(by.id("builder-template-new"))).toBeVisible().withTimeout(8000);
  await element(by.id("builder-template-new")).tap();
  const stats = await getBuilderStats();
  if (stats.drillCount <= 0) {
    throw new Error("New template did not create drills");
  }
}

async function startSessionFromBuilder() {
  await element(by.id("builder-start-session")).tap();

  try {
    await waitFor(element(by.id("active-screen"))).toBeVisible().withTimeout(12000);
  } catch (error) {
    try {
      const attrs = await element(by.id("builder-error-text")).getAttributes();
      const errorMessage = attrs.text ?? attrs.label ?? attrs.value;
      throw new Error(`Session did not start. Builder error: ${errorMessage}`);
    } catch {
      throw error;
    }
  }
}

describe("Session builder e2e", () => {
  it("adds a drill when tapping Add Drill", async () => {
    await openBuilderScreen();
    await createFreshTemplate();

    const before = await getBuilderStats();
    await element(by.id("builder-add-drill")).tap();
    await waitForDrillCount(before.drillCount + 1, 10000);
  });

  it("removes a drill when tapping Remove", async () => {
    await openBuilderScreen();
    await createFreshTemplate();

    const current = await getBuilderStats();
    await waitFor(element(by.text("Remove")).atIndex(0)).toBeVisible().withTimeout(10000);
    await element(by.text("Remove")).atIndex(0).tap();
    await waitForDrillCount(Math.max(0, current.drillCount - 1), 10000);
  });

  it("starts a session from builder", async () => {
    await openBuilderScreen();
    await createFreshTemplate();
    await startSessionFromBuilder();
  });

  it("completes a session by skipping drills", async () => {
    await openBuilderScreen();
    await createFreshTemplate();
    await startSessionFromBuilder();

    let completed = false;
    for (let i = 0; i < 16; i += 1) {
      try {
        await waitFor(element(by.id("complete-screen"))).toBeVisible().withTimeout(1000);
        completed = true;
        break;
      } catch {
        await waitFor(element(by.id("active-skip-button"))).toBeVisible().withTimeout(5000);
        await element(by.id("active-skip-button")).tap();
      }
    }

    if (!completed) {
      await waitFor(element(by.id("complete-screen"))).toBeVisible().withTimeout(15000);
    }

    await waitFor(element(by.id("complete-continue-button"))).toBeVisible().withTimeout(10000);
  });
});
