import bcrypt from "bcryptjs";
import { createHmac, pbkdf2, timingSafeEqual } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const TOKEN_TTL_SECONDS = 60 * 60 * 24;

type DriverTokenPayload = {
  sub: string;
  driverId: string;
  email: string;
  role: "driver";
};

function tokenSecret() {
  const configured = process.env.AUTH_TOKEN_SECRET ?? process.env.JWT_SECRET;
  if (configured) return configured;

  if (process.env.LOCAL_DEV_ONLY === "true" || process.env.NODE_ENV !== "production") {
    return "local-dev-driver-auth-secret";
  }

  throw new Error("Missing AUTH_TOKEN_SECRET or JWT_SECRET.");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  if (/^\$2[aby]\$/.test(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }

  const [algorithm, iterationText, salt, expected] = storedHash.split("$");
  if (algorithm !== `pbkdf2_${PASSWORD_DIGEST}` || !iterationText || !salt || !expected) {
    return false;
  }

  const iterations = Number(iterationText);
  if (!Number.isInteger(iterations) || iterations < 1) return false;

  const actualHash = await pbkdf2Async(
    password,
    salt,
    iterations,
    PASSWORD_KEY_LENGTH,
    PASSWORD_DIGEST,
  );
  const expectedHash = Buffer.from(expected, "base64url");

  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash);
}

export function signDriverToken(payload: DriverTokenPayload) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedBody = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = createHmac("sha256", tokenSecret())
    .update(`${header}.${encodedBody}`)
    .digest("base64url");

  return {
    token: `${header}.${encodedBody}.${signature}`,
    expiresAt: new Date((now + TOKEN_TTL_SECONDS) * 1000).toISOString(),
  };
}
