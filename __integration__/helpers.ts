import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client wired to the local Docker instance.
 * Reads from .env.test.local (loaded automatically by vitest's envDir config).
 */
export function getLocalSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY.\n" +
        "Make sure .env.test.local exists and `npx supabase start` is running."
    );
  }

  return createClient(url, key);
}
