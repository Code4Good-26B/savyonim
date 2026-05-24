import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  return supabaseUrl;
}

function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return anonKey;
}

function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing required Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return serviceRoleKey;
}

export function readBearerToken(request?: Request): string | null {
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function createSupabaseClient(accessToken?: string) {
  const supabaseUrl = getSupabaseUrl();
  const key = accessToken ? getSupabaseAnonKey() : getSupabaseServiceRoleKey();

  return createClient(supabaseUrl, key, accessToken ? {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  } : undefined);
}

export function createAuthenticatedSupabaseClient(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return { error: "Missing Authorization header" } as const;
  }

  return { client: createSupabaseClient(token), token } as const;
}
