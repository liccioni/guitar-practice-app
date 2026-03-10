async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openHome() {
  try {
    await waitForVisible("home-start-practice", 40000);
  } catch {
    await waitForVisible("home-quick-start-practice", 40000);
  }
}

async function openBuilderFromHome() {
  try {
    await waitForVisible("home-quick-start-practice", 8000);
    await element(by.id("home-quick-start-practice")).tap();
    try {
      await waitFor(element(by.text("Open Builder")).atIndex(0)).toBeVisible().withTimeout(12000);
      await element(by.text("Open Builder")).atIndex(0).tap();
      return;
    } catch {}
  } catch {}

  await waitForVisible("home-start-practice", 12000);
  await element(by.id("home-start-practice")).tap();
}

describe("Onboarding recommendation e2e", () => {
  it("can reset onboarding state and still reach builder", async () => {
    await openHome();

    await element(by.text("Profile")).atIndex(0).tap();
    await waitFor(element(by.text("Profile")).atIndex(0)).toBeVisible().withTimeout(12000);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await waitFor(element(by.text("Reset Questionnaire"))).toBeVisible().withTimeout(1000);
        break;
      } catch {
        await element(by.id("home-scroll")).swipe("up", "fast", 0.7);
      }
    }
    await waitFor(element(by.text("Reset Questionnaire"))).toBeVisible().withTimeout(12000);
    await element(by.text("Reset Questionnaire")).tap();
    await waitFor(element(by.text("Questionnaire not completed yet."))).toBeVisible().withTimeout(12000);

    await element(by.text("Practice")).atIndex(0).tap();
    await openBuilderFromHome();
    await waitForVisible("builder-start-session", 15000);
    await waitForVisible("builder-drill-count", 10000);
  });
});
