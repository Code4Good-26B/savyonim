import { query } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

export async function POST(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json();
  const {
    ride_request_id,
    driver_id,
    ambulance_id,
    assigned_by_user_id,
    representitive_user_id,
  } = body;

  if (!ride_request_id) return Response.json({ error: "ride_request_id is required" }, { status: 400 });
  if (!driver_id) return Response.json({ error: "driver_id is required" }, { status: 400 });
  if (!ambulance_id) return Response.json({ error: "ambulance_id is required" }, { status: 400 });
  if (!assigned_by_user_id) return Response.json({ error: "assigned_by_user_id is required" }, { status: 400 });

  try {
    const created = await query(
      `
        insert into public.rides (
          ride_request_id,
          driver_id,
          ambulance_id,
          assigned_by_user_id,
          representitive_user_id
        )
        values ($1, $2, $3, $4, $5)
        returning ${RIDE_FIELDS}
      `,
      [ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id],
    );

    return Response.json(created.rows[0], { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string; message?: string };
    if (pgError.code === "23505") {
      if (pgError.constraint === "ux_rides_active_driver") {
        return Response.json({ error: "Driver already has an active ride" }, { status: 409 });
      }
      if (pgError.constraint === "ux_rides_active_ambulance") {
        return Response.json({ error: "Ambulance already has an active ride" }, { status: 409 });
      }
      if (pgError.constraint === "ux_rides_active_request") {
        return Response.json({ error: "Ride request already has an active assignment" }, { status: 409 });
      }
      return Response.json({ error: "Assignment conflict" }, { status: 409 });
    }
    if (pgError.code === "23503") {
      return Response.json({ error: "One or more referenced IDs do not exist" }, { status: 400 });
    }
    throw error;
  }
}
