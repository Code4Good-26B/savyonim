import { signDriverToken, verifyPassword } from "@/lib/auth/local-auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type DriverAuthRow = {
  user_id: string;
  driver_id: string;
  full_name: string;
  email: string;
  password_hash: string | null;
  service_zone_id: string | null;
  user_active: boolean;
  driver_active: boolean;
  account_status: string;
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

  const result = await query<DriverAuthRow>(
    `
      select
        u.id as user_id,
        d.id as driver_id,
        u.full_name,
        coalesce(u.email, au.email) as email,
        coalesce(u.password_hash, au.encrypted_password) as password_hash,
        d.service_zone_id,
        u.is_active as user_active,
        d.is_active as driver_active,
        coalesce(to_jsonb(u)->>'status', 'approved') as account_status
      from public.users u
      join auth.users au on au.id = u.id
      join public.drivers d on d.user_id = u.id
      where lower(coalesce(u.email, au.email)) = lower($1)
        and u.role = 'driver'
      limit 1
    `,
    [email],
  );

  const driver = result.rows[0];
  if (!driver || !(await verifyPassword(password, driver.password_hash))) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!driver.user_active || !driver.driver_active || driver.account_status !== "approved") {
    return Response.json({ error: "This account is not an approved active driver" }, { status: 403 });
  }

  const { token, expiresAt } = signDriverToken({
    sub: driver.user_id,
    driverId: driver.driver_id,
    email: driver.email,
    role: "driver",
  });

  return Response.json({
    userId: driver.user_id,
    driverId: driver.driver_id,
    fullName: driver.full_name,
    email: driver.email,
    role: "driver",
    serviceZoneId: driver.service_zone_id,
    token,
    expiresAt,
  });
}
