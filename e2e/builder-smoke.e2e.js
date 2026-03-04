describe("Session builder smoke", () => {
  it("adds a drill and starts a session", async () => {
    let onBuilder = false;

    try {
      await waitFor(element(by.id("home-start-practice"))).toBeVisible().withTimeout(12000);
      await element(by.id("home-start-practice")).tap();
      onBuilder = true;
    } catch {
      try {
        await waitFor(element(by.text("Start Practice"))).toBeVisible().withTimeout(12000);
        await element(by.text("Start Practice")).tap();
        onBuilder = true;
      } catch {
        await waitFor(element(by.text("Session Builder"))).toBeVisible().withTimeout(12000);
        onBuilder = true;
      }
    }

    if (!onBuilder) {
      throw new Error("Could not reach Session Builder from launch state");
    }

    try {
      await waitFor(element(by.id("builder-add-drill"))).toBeVisible().withTimeout(12000);
      await element(by.id("builder-add-drill")).tap();
    } catch {
      await waitFor(element(by.text("Add Drill"))).toBeVisible().withTimeout(12000);
      await element(by.text("Add Drill")).tap();
    }

    try {
      await waitFor(element(by.id("builder-start-session"))).toBeVisible().withTimeout(12000);
      await element(by.id("builder-start-session")).tap();
    } catch {
      await waitFor(element(by.text("Start This Session"))).toBeVisible().withTimeout(12000);
      await element(by.text("Start This Session")).tap();
    }

    await waitFor(element(by.id("active-screen"))).toBeVisible().withTimeout(15000);
  });
});
