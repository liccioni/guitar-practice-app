beforeEach(async () => {
  await device.launchApp({
    newInstance: true,
    launchArgs: {
      detoxEnableSynchronization: 0,
    },
  });
  await device.disableSynchronization();
});
