/**
 * Runs inside each test worker before tests execute.
 * Loads .env.test.local so all integration tests get the local Supabase credentials.
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.test.local"), override: true });

function populateEnvFromSupabaseStatus() {
	try {
		const output = execSync("npx supabase status -o env", {
			cwd: process.cwd(),
			stdio: ["ignore", "pipe", "ignore"],
			encoding: "utf8",
		});

		for (const line of output.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

			const [key, ...rest] = trimmed.split("=");
			const value = rest.join("=");
			if (!key || !value) continue;

			const normalized = value.replace(/^"|"$/g, "");

			if (!process.env[key]) {
				process.env[key] = normalized;
			}

			if (key === "API_URL") {
				process.env.SUPABASE_URL ??= normalized;
				process.env.NEXT_PUBLIC_SUPABASE_URL ??= normalized;
			}
			if (key === "ANON_KEY") {
				process.env.SUPABASE_ANON_KEY ??= normalized;
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= normalized;
			}
			if (key === "SERVICE_ROLE_KEY") {
				process.env.SUPABASE_SERVICE_ROLE_KEY ??= normalized;
			}
			if (key === "DB_URL") {
				process.env.DATABASE_URL ??= normalized;
				process.env.SUPABASE_DB_URL ??= normalized;
			}
		}
	} catch {
		// Best-effort fallback only; setup.ts already validates local stack availability.
	}
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
	populateEnvFromSupabaseStatus();
}
