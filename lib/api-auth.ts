import { createHmac, timingSafeEqual } from "crypto";
import { verifyDriverToken, type VerifiedDriverToken } from "@/lib/auth/local-auth";
import { readBearerToken } from "@/lib/supabase";

type SupabaseClaims = {
  sub: string;
  role?: string;
  aud?: string | string[];
  exp: number;
  [key: string]: unknown;
};

export type AuthContext =
  | { ok: true; token: string; kind: "driver"; driver: VerifiedDriverToken }
  | { ok: true; token: string; kind: "user"; claims: SupabaseClaims }
  | { ok: false; error: string };

function jwtSecret() {
  return process.env.JWT_SECRET ?? process.env.AUTH_TOKEN_SECRET ?? null;
}

function verifySupabaseJwt(token: string): SupabaseClaims | null {
  const secret = jwtSecret();
  if (!secret) return null;

  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const actualSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    actualSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(actualSignature, expectedSignatureBuffer)
  ) {
    return null;
  }

  let claims: Partial<SupabaseClaims>;
  try {
    claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

  return claims as SupabaseClaims;
}

export function requireBearerAuth(request: Request): AuthContext {
  const token = readBearerToken(request);
  if (!token) {
    return { ok: false, error: "Missing Authorization header" };
  }

  const driver = verifyDriverToken(token);
  if (driver) return { ok: true, token, kind: "driver", driver };

  const claims = verifySupabaseJwt(token);
  if (claims) return { ok: true, token, kind: "user", claims };

  return { ok: false, error: "Invalid or expired Authorization token" };
}

export function requireDriverAuth(request: Request): Extract<AuthContext, { kind: "driver" }> | { ok: false; error: string; status: number } {
  const auth = requireBearerAuth(request);
  if (!auth.ok) return { ...auth, status: 401 };
  if (auth.kind !== "driver") {
    return { ok: false, error: "Driver token is required", status: 403 };
  }
  return auth;
}
