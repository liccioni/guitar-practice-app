beforeEach(async () => {
  await device.launchApp({ delete: true, newInstance: true });
  await device.disableSynchronization();
});
