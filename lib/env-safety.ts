const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const LOCAL_POSTGRES_PORTS = new Set(["5432", "54320", "54322", "55432"]);
const LOCAL_HTTP_PORTS = new Set(["3000", "54321"]);
const HOSTED_SUPABASE_HOST_PATTERN = /(^|\.)supabase\.co$/i;
const LOCAL_MODES = new Set(["development", "test"]);

type EnvMap = NodeJS.ProcessEnv;

function isLocalMode() {
  return LOCAL_MODES.has(process.env.NODE_ENV ?? "development");
}

function parseUrl(value: string, key: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

function normalizeHost(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "");
}

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname) || LOCAL_HOSTS.has(normalizeHost(hostname));
}

function assertLocalHttpUrl(key: string, value: string) {
  const parsedUrl = parseUrl(value, key);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`${key} must be an HTTP URL.`);
  }

  if (HOSTED_SUPABASE_HOST_PATTERN.test(parsedUrl.hostname)) {
    throw new Error(`${key} points to hosted Supabase. Local mode must use localhost only.`);
  }

  if (!isLocalHost(parsedUrl.hostname)) {
    throw new Error(`${key} must use localhost or 127.0.0.1 in local mode.`);
  }

  if (parsedUrl.port && !LOCAL_HTTP_PORTS.has(parsedUrl.port)) {
    throw new Error(`${key} uses unexpected local port ${parsedUrl.port}.`);
  }
}

function assertLocalPostgresUrl(key: string, value: string) {
  const parsedUrl = parseUrl(value, key);

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error(`${key} must be a Postgres connection string.`);
  }

  if (!isLocalHost(parsedUrl.hostname)) {
    throw new Error(`${key} must use localhost or 127.0.0.1 in local mode.`);
  }

  if (parsedUrl.port && !LOCAL_POSTGRES_PORTS.has(parsedUrl.port)) {
    throw new Error(`${key} uses unexpected local Postgres port ${parsedUrl.port}.`);
  }
}

function assertNoHostedCredentialValues(env: EnvMap) {
  const forbiddenKeys = ["VERCEL_OIDC_TOKEN", "SUPABASE_SERVICE_ROLE_KEY"];

  for (const key of forbiddenKeys) {
    if (env[key]) {
      throw new Error(`${key} must not be present in local development or test mode.`);
    }
  }
}

export function assertLocalOnlyEnvironment(env: EnvMap = process.env) {
  if (!isLocalMode()) return;

  assertNoHostedCredentialValues(env);

  const httpUrlKeys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"];
  const postgresUrlKeys = ["DATABASE_URL", "SUPABASE_DB_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"];

  for (const key of httpUrlKeys) {
    const value = env[key];
    if (value) assertLocalHttpUrl(key, value);
  }

  for (const key of postgresUrlKeys) {
    const value = env[key];
    if (value) assertLocalPostgresUrl(key, value);
  }
}

export function assertLocalSupabaseUrl(supabaseUrl: string) {
  if (!isLocalMode()) return;

  assertLocalHttpUrl("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
}
