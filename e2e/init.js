beforeEach(async () => {
  await device.launchApp({
    delete: true,
    newInstance: true,
    launchArgs: {
      detoxEnableSynchronization: 0,
    },
  });
  await device.disableSynchronization();
});
