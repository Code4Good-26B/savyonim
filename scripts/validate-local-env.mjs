const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const HOSTED_SUPABASE_HOST_PATTERN = /(^|\.)supabase\.co$/i;
const LOCAL_HTTP_PORTS = new Set(["3000", "54321"]);
const LOCAL_POSTGRES_PORTS = new Set(["5432", "54320", "54322", "55432"]);

function parseDotenv(contents) {
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

async function loadEnvFile(path) {
  try {
    const fs = await import("node:fs/promises");
    return parseDotenv(await fs.readFile(path, "utf8"));
  } catch {
    return {};
  }
}

function normalizeHost(hostname) {
  return hostname.replace(/^\[|\]$/g, "");
}

function isLocalHost(hostname) {
  return LOCAL_HOSTS.has(hostname) || LOCAL_HOSTS.has(normalizeHost(hostname));
}

function assertUrl(key, value) {
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }

  if (HOSTED_SUPABASE_HOST_PATTERN.test(parsedUrl.hostname)) {
    throw new Error(`${key} points to hosted Supabase. Local mode must use localhost only.`);
  }

  if (!isLocalHost(parsedUrl.hostname)) {
    throw new Error(`${key} must use localhost or 127.0.0.1 in local mode.`);
  }

  if (["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    if (parsedUrl.port && !LOCAL_POSTGRES_PORTS.has(parsedUrl.port)) {
      throw new Error(`${key} uses unexpected local Postgres port ${parsedUrl.port}.`);
    }
    return;
  }

  if (["http:", "https:"].includes(parsedUrl.protocol)) {
    if (parsedUrl.port && !LOCAL_HTTP_PORTS.has(parsedUrl.port)) {
      throw new Error(`${key} uses unexpected local HTTP port ${parsedUrl.port}.`);
    }
    return;
  }

  throw new Error(`${key} uses unsupported protocol ${parsedUrl.protocol}.`);
}

const urlKeys = [
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
];

function validateEnvMap(name, env) {
  for (const key of urlKeys) {
    if (env[key]) assertUrl(`${name}:${key}`, env[key]);
  }

  for (const key of ["VERCEL_OIDC_TOKEN", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (env[key]) {
      throw new Error(`${name}:${key} must not be present in local development or test mode.`);
    }
  }
}

validateEnvMap("process.env", process.env);
validateEnvMap(".env.local", await loadEnvFile(".env.local"));
validateEnvMap(".env.test", await loadEnvFile(".env.test"));
