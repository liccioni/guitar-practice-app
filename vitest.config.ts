import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/application/**/*.ts",
        "src/domain/**/*.ts",
        "src/persistence/**/*.ts",
      ],
      exclude: ["**/types.ts", "src/persistence/PracticeRepository.ts"],
      reporter: ["text", "lcov"],
      thresholds: {
        perFile: true,
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 95,
      },
    },
  },
});
