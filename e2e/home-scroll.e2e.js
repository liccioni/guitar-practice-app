async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openHomeDeterministic() {
  await device.launchApp({ newInstance: true, delete: true });

  try {
    await waitForVisible("home-quick-start-practice", 30000);
    return;
  } catch {
    await waitForVisible("home-start-practice", 30000);
  }
}

describe("Home scroll behavior", () => {
  it("can scroll to lower dashboard content", async () => {
    await openHomeDeterministic();

    // Achievements is near the bottom of Home; reaching it proves vertical scrolling works.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await waitForVisible("home-achievements-title", 1200);
        return;
      } catch {
        await element(by.id("home-scroll")).swipe("up", "fast", 0.65);
      }
    }

    await waitForVisible("home-achievements-title", 6000);
  });
});
