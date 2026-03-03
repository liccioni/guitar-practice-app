describe("Session builder smoke", () => {
  it("adds a drill and starts a session", async () => {
    await expect(element(by.id("home-start-practice"))).toBeVisible();
    await element(by.id("home-start-practice")).tap();

    await expect(element(by.id("builder-add-drill"))).toBeVisible();
    await element(by.id("builder-add-drill")).tap();

    await expect(element(by.id("builder-start-session"))).toBeVisible();
    await element(by.id("builder-start-session")).tap();

    await expect(element(by.id("active-screen"))).toBeVisible();
  });
});
