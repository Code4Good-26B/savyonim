import { createClient } from "@supabase/supabase-js";
import { assertLocalOnlyEnvironment, assertLocalSupabaseUrl } from "@/lib/env-safety";

export function createSupabaseClient() {
  assertLocalOnlyEnvironment();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  const missingEnvVars = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing required Supabase environment variable(s): ${missingEnvVars.join(", ")}`
    );
  }

  assertLocalSupabaseUrl(supabaseUrl);

  return createClient(supabaseUrl, supabaseAnonKey);
}
