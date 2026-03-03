const detox = require("detox");
const config = require("../.detoxrc");

beforeAll(async () => {
  await detox.init(config);
}, 120000);

beforeEach(async () => {
  await device.launchApp({ delete: true, newInstance: true });
});

afterAll(async () => {
  await detox.cleanup();
});
