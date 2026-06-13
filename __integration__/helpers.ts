import { SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { createSupabaseAnonClient, createSupabaseClient } from "../lib/supabase";

const DEFAULT_SEED_PASSWORD = "Seed1234!";

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function createLocalAccessToken(userId: string) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET for local integration auth fallback");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "supabase",
    aud: "authenticated",
    role: "authenticated",
    sub: userId,
    iat: now,
    exp: now + 60 * 60,
  };

  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Returns a Supabase client wired to the local Docker instance.
 * Reads from .env.test.local, which is loaded by the integration test setup
 * file via dotenv (see __integration__/load-env.ts).
 */
export function getLocalSupabase(): SupabaseClient {
  return createSupabaseAnonClient();
}

export async function signInSeedUser(email: string, password = DEFAULT_SEED_PASSWORD): Promise<string> {
  const supabase = getLocalSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error && data.session?.access_token) {
    return data.session.access_token;
  }

  console.error("signInWithPassword failed in integration test:", error?.message);

  // Fallback for local stacks where password sign-in is disabled/misconfigured.

  const seededByEmail: Record<string, string> = {
    "admin.dispatch@savionim.test": "22222222-0000-0000-0000-000000000010",
    "avi.cohen@savionim.test": "22222222-0000-0000-0000-000000000001",
    "noa.levi@savionim.test": "22222222-0000-0000-0000-000000000002",
    "yossi.mizrahi@savionim.test": "22222222-0000-0000-0000-000000000003",
  };

  const userId = seededByEmail[email];
  if (!userId) {
    throw new Error(`Failed to sign in ${email}: ${error?.message ?? "No fallback user ID"}`);
  }

  return createLocalAccessToken(userId);
}

export function getAuthenticatedSupabase(token: string): SupabaseClient {
  return createSupabaseClient(token);
}

export function createAuthenticatedRequest(url: string, token: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);

  return new Request(url, {
    ...init,
    headers,
  });
}
