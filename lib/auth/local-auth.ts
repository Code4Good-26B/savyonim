import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

type TokenPayload = {
  sub: string;
  driverId: string;
  email: string;
  role: "driver";
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function tokenSecret() {
  const configured = process.env.AUTH_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured) return configured;

  if (process.env.LOCAL_DEV_ONLY === "true" || process.env.NODE_ENV !== "production") {
    return "local-dev-driver-auth-secret";
  }

  throw new Error("Missing AUTH_TOKEN_SECRET or JWT_SECRET.");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await pbkdf2Async(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST);
  return `pbkdf2_${PASSWORD_DIGEST}$${PASSWORD_ITERATIONS}$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, iterationText, salt, expected] = storedHash.split("$");
  if (algorithm !== `pbkdf2_${PASSWORD_DIGEST}` || !iterationText || !salt || !expected) {
    return false;
  }

  const iterations = Number(iterationText);
  if (!Number.isInteger(iterations) || iterations < 1) return false;

  const actualHash = await pbkdf2Async(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST);
  const expectedHash = Buffer.from(expected, "base64url");

  if (actualHash.length !== expectedHash.length) return false;
  return timingSafeEqual(actualHash, expectedHash);
}

export function signDriverToken(payload: TokenPayload) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(body));
  const signature = createHmac("sha256", tokenSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    expiresAt: new Date((now + TOKEN_TTL_SECONDS) * 1000).toISOString(),
  };
}
