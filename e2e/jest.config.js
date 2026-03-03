module.exports = {
  testTimeout: 120000,
  maxWorkers: 1,
  testMatch: ["**/*.e2e.js"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: ["detox/runners/jest/reporter"],
  setupFilesAfterEnv: ["<rootDir>/init.js"],
  testEnvironment: "detox/runners/jest/testEnvironment",
  verbose: true,
};
