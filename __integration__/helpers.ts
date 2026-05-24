import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAnonClient, createSupabaseClient } from "../lib/supabase";

const DEFAULT_SEED_PASSWORD = "Seed1234!";

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

  if (error || !data.session?.access_token) {
    throw new Error(`Failed to sign in ${email}: ${error?.message ?? "No session token returned"}`);
  }

  return data.session.access_token;
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
