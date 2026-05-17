import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missingEnvVars = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing required Supabase environment variable(s): ${missingEnvVars.join(", ")}`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
