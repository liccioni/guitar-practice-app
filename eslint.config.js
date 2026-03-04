const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ["node_modules/*", ".expo/*"],
  },
  {
    files: ["e2e/**/*.js"],
    languageOptions: {
      globals: {
        afterAll: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        device: "readonly",
        element: "readonly",
        expect: "readonly",
        it: "readonly",
        by: "readonly",
        waitFor: "readonly",
      },
    },
  },
]);
