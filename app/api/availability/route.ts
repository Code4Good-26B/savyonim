import { query } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

const DRIVER_FIELDS = "id, user_id, contact_phone, service_zone_id, is_active";
const AMBULANCE_FIELDS = "id, license_plate, service_zone_id, is_available, is_active";

export async function GET(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    const drivers = await query(
      `
        select ${DRIVER_FIELDS}
        from public.drivers d
        where d.is_active = true
          and not exists (
            select 1
            from public.rides r
            where r.driver_id = d.id
              and r.status in ('assigned', 'in_progress')
          )
        order by d.created_at asc
      `,
    );

    const ambulances = await query(
      `
        select ${AMBULANCE_FIELDS}
        from public.ambulances a
        where a.is_active = true
          and a.is_available = true
          and not exists (
            select 1
            from public.rides r
            where r.ambulance_id = a.id
              and r.status in ('assigned', 'in_progress')
          )
        order by a.created_at asc
      `,
    );

    return Response.json({ drivers: drivers.rows, ambulances: ambulances.rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
