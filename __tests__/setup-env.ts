import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const testEnvPath = resolve(process.cwd(), ".env.test");

for (const line of readFileSync(testEnvPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) continue;

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) continue;

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();

  process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
}

function assertLocalHttpUrl(value: string | undefined, name: string) {
  if (!value || !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/|$)/.test(value)) {
    throw new Error(`${name} must be a local URL in .env.test.`);
  }
}

function assertLocalPostgresUrl(value: string | undefined, name: string) {
  if (!value || !/^postgres(?:ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost|\[::1\]):55432(?:\/|$)/.test(value)) {
    throw new Error(`${name} must point at the local Docker test database in .env.test.`);
  }
}

assertLocalHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
assertLocalHttpUrl(process.env.SUPABASE_URL, "SUPABASE_URL");
assertLocalPostgresUrl(process.env.DATABASE_URL, "DATABASE_URL");
assertLocalPostgresUrl(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL");
