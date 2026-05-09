import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  const missingEnvVars = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required Supabase environment variable(s): ${missingEnvVars.join(", ")}`
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
