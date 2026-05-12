/**
 * Runs inside each test worker before tests execute.
 * Loads .env.test.local so all integration tests get the local Supabase credentials.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.test.local"), override: true });
