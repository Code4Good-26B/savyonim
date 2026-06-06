import { execSync } from "child_process";
import { config } from "dotenv";
import { resolve } from "path";

/**
 * Global setup — runs ONCE before all integration tests.
 * Wipes the local Docker DB and re-applies all migrations + seed.sql
 * so every test run starts from a clean, known state.
 *
 * Requires the local Supabase stack to be running:
 *   npx supabase start
 */
export async function setup() {
  // Load .env.test.local so NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY
  // are available in test processes (globalSetup runs before envDir is applied)
  config({ path: resolve(process.cwd(), ".env.test.local"), override: true });

  console.log("\n[integration setup] Resetting local Supabase DB...");
  try {
    execSync("npx supabase db reset --local", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("[integration setup] DB reset complete.\n");
  } catch (err) {
    console.error(
      "[integration setup] ERROR: Could not reset local DB.\n" +
        "Make sure Docker is running and `npx supabase start` has been executed first.\n"
    );
    throw err;
  }
}
