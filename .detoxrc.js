/** @type {Detox.DetoxConfig} */
const iosSimulatorType = process.env.DETOX_DEVICE || "iPhone 16e";

module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/GuitarPractice.app",
      build: "bash scripts/detox-build-ios.sh",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: iosSimulatorType,
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
  },
};
