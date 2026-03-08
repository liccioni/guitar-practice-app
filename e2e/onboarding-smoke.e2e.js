async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openHomeIfNeeded() {
  try {
    await waitForVisible("home-start-practice", 40000);
  } catch {
    await waitForVisible("home-quick-start-practice", 40000);
  }
}

async function scrollToOnboarding() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await waitForVisible("onboarding-generate", 1200);
      return;
    } catch {
      await element(by.id("home-scroll")).swipe("up", "fast", 0.65);
    }
  }
  await waitForVisible("onboarding-generate", 5000);
}

describe("Onboarding recommendation e2e", () => {
  it("generates and applies a starter suggestion", async () => {
    await openHomeIfNeeded();
    await scrollToOnboarding();
    await element(by.id("onboarding-generate")).tap();

    await waitForVisible("onboarding-apply-suggestion", 10000);
    await element(by.id("onboarding-apply-suggestion")).tap();

    await waitForVisible("builder-start-session", 15000);
    await waitForVisible("builder-drill-count", 10000);
  });
});
