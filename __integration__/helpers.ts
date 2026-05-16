import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../lib/supabase";

/**
 * Returns a Supabase client wired to the local Docker instance.
 * Reads from .env.test.local, which is loaded by the integration test setup
 * file via dotenv (see __integration__/load-env.ts).
 */
export function getLocalSupabase(): SupabaseClient {
  return createSupabaseClient();
}
