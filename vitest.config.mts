import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Load local Supabase credentials for integration tests
  envDir: ".",
  test: {
    environment: "node",
    // Projects let us run unit and integration tests separately
    projects: [
      {
        test: {
          name: "unit",
          include: ["__tests__/**/*.test.ts"],
          environment: "node",
        },
        plugins: [tsconfigPaths()],
      },
      {
        test: {
          name: "integration",
          include: ["__integration__/**/*.test.ts"],
          environment: "node",
          // Runs once before all integration tests to reset the DB
          globalSetup: ["__integration__/setup.ts"],
          // Loads .env.test.local into each test worker process
          setupFiles: ["__integration__/load-env.ts"],
          // Give integration tests more time (real DB calls)
          testTimeout: 15000,
        },
        plugins: [tsconfigPaths()],
      },
    ],
  },
});
