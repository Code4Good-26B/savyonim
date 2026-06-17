import { createSupabaseAnonClient, createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type UserRow = {
  full_name: string;
  role: string;
  is_active: boolean;
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (!password) return Response.json({ error: "password is required" }, { status: 400 });

  const supabase = createSupabaseAnonClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.session) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const result = await query<UserRow>(
    `SELECT full_name, role, is_active FROM public.users WHERE id = $1`,
    [authData.user.id],
  );

  const user = result.rows[0];
  if (!user) return Response.json({ error: "User not found" }, { status: 401 });
  if (user.role !== "admin") {
    return Response.json({ error: "This portal is for administrators only" }, { status: 403 });
  }
  if (!user.is_active) {
    return Response.json({ error: "Account is inactive" }, { status: 403 });
  }

  const token = authData.session.access_token;
  const expiresAt = authData.session.expires_at
    ? new Date(authData.session.expires_at * 1000).toISOString()
    : undefined;

  const session = {
    userId: authData.user.id,
    fullName: user.full_name,
    email,
    role: "admin" as const,
    token,
    expiresAt,
  };

  const cookieMaxAge = 60 * 60 * 24;
  const response = Response.json(session, { status: 200 });
  response.headers.set(
    "Set-Cookie",
    `savionim-admin-token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${cookieMaxAge}`,
  );

  return response;
}
