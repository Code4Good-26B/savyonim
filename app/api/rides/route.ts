import { transaction } from "@/lib/db";
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
    ambulance_id,
    representitive_user_id,
  } = body;
  const driver_id = auth.kind === "driver" ? auth.driver.driverId : body.driver_id;
  const assigned_by_user_id = auth.kind === "driver" ? auth.driver.sub : body.assigned_by_user_id;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUuid = (uuid: string) => UUID_REGEX.test(uuid);

  if (!ride_request_id) return Response.json({ error: "ride_request_id is required" }, { status: 400 });
  if (!isValidUuid(ride_request_id)) return Response.json({ error: "Invalid ride_request_id format" }, { status: 400 });
  
  if (!driver_id) return Response.json({ error: "driver_id is required" }, { status: 400 });
  if (!isValidUuid(driver_id)) return Response.json({ error: "Invalid driver_id format" }, { status: 400 });

  if (!ambulance_id) return Response.json({ error: "ambulance_id is required" }, { status: 400 });
  if (!isValidUuid(ambulance_id)) return Response.json({ error: "Invalid ambulance_id format" }, { status: 400 });

  if (!assigned_by_user_id) return Response.json({ error: "assigned_by_user_id is required" }, { status: 400 });
  if (!isValidUuid(assigned_by_user_id)) return Response.json({ error: "Invalid assigned_by_user_id format" }, { status: 400 });


  try {
    const created = await transaction(async (client) => {
      const requestResult = await client.query<{ status: string }>(
        `
          select status
          from public.ride_requests
          where id = $1::uuid
          for update
        `,
        [ride_request_id],
      );

      const rideRequest = requestResult.rows[0];
      if (!rideRequest) return { error: "Ride request not found", status: 404 } as const;
      if (rideRequest.status !== "approved") {
        return { error: "Ride request is no longer open for assignment", status: 409 } as const;
      }

      const result = await client.query(
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

      return { ride: result.rows[0] } as const;
    });

    if ("error" in created) {
      return Response.json({ error: created.error }, { status: created.status });
    }

    return Response.json(created.ride, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string; message?: string };
    if (pgError.code === "23505") {
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
