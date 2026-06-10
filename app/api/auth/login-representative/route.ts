import { signRepresentativeToken, verifyPassword } from "@/lib/auth/local-auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type RepresentativeAuthRow = {
  user_id: string;
  full_name: string;
  email: string;
  password_hash: string | null;
  is_active: boolean;
};

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (!password) return Response.json({ error: "password is required" }, { status: 400 });

  const result = await query<RepresentativeAuthRow>(
    `
      SELECT
        u.id AS user_id,
        u.full_name,
        coalesce(u.email, au.email) AS email,
        coalesce(u.password_hash, au.encrypted_password) AS password_hash,
        u.is_active
      FROM public.users u
      JOIN auth.users au ON au.id = u.id
      WHERE lower(coalesce(u.email, au.email)) = lower($1)
        AND u.role = 'representative'
      LIMIT 1
    `,
    [email],
  );

  const rep = result.rows[0];
  if (!rep) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!rep.is_active) {
    return Response.json({ error: "Account pending approval" }, { status: 403 });
  }

  const isValidPassword = await verifyPassword(password, rep.password_hash);
  if (!isValidPassword) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { token, expiresAt } = signRepresentativeToken({
    sub: rep.user_id,
    email: rep.email,
    role: "representative",
  });

  return Response.json({
    userId: rep.user_id,
    fullName: rep.full_name,
    email: rep.email,
    role: "representative",
    token,
    expiresAt,
  });
}
