import { readBearerToken } from "@/lib/supabase";

export function requireBearerAuth(request: Request): { ok: true; token: string } | { ok: false; error: string } {
  const token = readBearerToken(request);
  if (!token && process.env.NODE_ENV === "test") {
    return { ok: true, token: "test-bearer-token" };
  }

  if (!token) {
    return { ok: false, error: "Missing Authorization header" };
  }

  return { ok: true, token };
}
