import { createSupabaseAnonClient } from "@/lib/supabase";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type UserRow = {
  full_name: string;
  role: string;
  status: string;
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

  // Authenticate via Supabase Auth (replaces custom password hash verification)
  const supabase = createSupabaseAnonClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const userId = authData.user.id;
  const accessToken = authData.session.access_token;

  // Verify role and approval status in public.users
  const result = await query<UserRow>(
    `select full_name, role, status from public.users where id = $1`,
    [userId],
  );

  const user = result.rows[0];
  if (!user) {
    return Response.json({ error: "User profile not found" }, { status: 401 });
  }

  if (user.role !== "representative" && user.role !== "admin") {
    return Response.json(
      { error: "This portal is for representatives and administrators only" },
      { status: 403 },
    );
  }

  if (user.status !== "approved") {
    return Response.json({ error: "Account pending approval" }, { status: 403 });
  }

  const expiresAt = authData.session.expires_at
    ? new Date(authData.session.expires_at * 1000).toISOString()
    : undefined;

  const session = {
    userId,
    fullName: user.full_name,
    email,
    role: user.role as "representative",
    token: accessToken,
    expiresAt,
  };

  // Set an HttpOnly cookie so middleware can gate dispatcher routes server-side
  const cookieMaxAge = 60 * 60 * 24; // 24 hours
  const response = Response.json(session, { status: 200 });
  response.headers.set(
    "Set-Cookie",
    `savionim-rep-token=${accessToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${cookieMaxAge}`,
  );

  return response;
}
