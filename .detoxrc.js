/** @type {Detox.DetoxConfig} */
const fs = require("fs");
const path = require("path");

const iosSimulatorType = process.env.DETOX_DEVICE || "iPhone 16e";
const workspaceName =
  process.env.IOS_APP_NAME ||
  fs
    .readdirSync(path.join(process.cwd(), "ios"), { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.endsWith(".xcworkspace"))
    ?.name.replace(/\.xcworkspace$/, "") ||
  "Fretline";

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
      binaryPath: `ios/build/Build/Products/Release-iphonesimulator/${workspaceName}.app`,
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
