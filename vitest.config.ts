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
        lines: 88,
        statements: 80,
        functions: 88,
        branches: 60,
      },
    },
  },
});
