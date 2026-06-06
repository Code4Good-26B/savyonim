import { randomUUID } from "crypto";
import { hashPassword, signDriverToken } from "@/lib/auth/local-auth";
import { query, transaction } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DriverInsertResult = {
  user_id: string;
  driver_id: string;
  service_zone_id: string | null;
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

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  const serviceZoneId =
    typeof body.serviceZoneId === "string" && body.serviceZoneId.trim()
      ? body.serviceZoneId.trim()
      : null;

  if (!fullName) return Response.json({ error: "fullName is required" }, { status: 400 });
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "email must be a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }
  if (serviceZoneId && !UUID_PATTERN.test(serviceZoneId)) {
    return Response.json({ error: "serviceZoneId must be a valid UUID" }, { status: 400 });
  }

  const existing = await query<{ id: string }>(
    "select id from auth.users where lower(email) = lower($1) limit 1",
    [email],
  );

  if ((existing.rowCount ?? 0) > 0) {
    return Response.json({ error: "A driver account with this email already exists" }, { status: 409 });
  }

  if (serviceZoneId) {
    const zone = await query<{ id: string }>(
      "select id from public.service_zones where id = $1 and is_active = true limit 1",
      [serviceZoneId],
    );
    if ((zone.rowCount ?? 0) === 0) {
      return Response.json({ error: "serviceZoneId does not match an active service zone" }, { status: 400 });
    }
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    const created = await transaction(async (client) => {
      await client.query(
        `
          insert into auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
          )
          values (
            $1,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            $2,
            $3,
            timezone('utc', now()),
            '{"provider":"local","providers":["local"]}'::jsonb,
            jsonb_build_object('app_role', 'driver', 'full_name', $4::text),
            timezone('utc', now()),
            timezone('utc', now())
          )
        `,
        [userId, email, passwordHash, fullName],
      );

      await client.query(
        `
          insert into public.users (id, full_name, email, phone, password_hash, role, is_active)
          values ($1, $2, $3, $4, $5, 'driver', true)
        `,
        [userId, fullName, email, phone, passwordHash],
      );

      const driver = await client.query<DriverInsertResult>(
        `
          insert into public.drivers (user_id, contact_phone, service_zone_id, is_active)
          values ($1, $2, $3, true)
          returning user_id, id as driver_id, service_zone_id
        `,
        [userId, phone, serviceZoneId],
      );

      return driver.rows[0];
    });

    const { token, expiresAt } = signDriverToken({
      sub: created.user_id,
      driverId: created.driver_id,
      email,
      role: "driver",
    });

    return Response.json(
      {
        userId: created.user_id,
        driverId: created.driver_id,
        fullName,
        email,
        role: "driver",
        serviceZoneId: created.service_zone_id,
        token,
        expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      return Response.json({ error: "A driver account with this email already exists" }, { status: 409 });
    }
    if (pgError.code === "23503") {
      return Response.json({ error: "serviceZoneId does not match an active service zone" }, { status: 400 });
    }
    throw error;
  }
}
