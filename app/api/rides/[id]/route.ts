import { query, transaction } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

type RideState = {
  driver_id: string;
  odometer_start_km: string | null;
  odometer_end_km: string | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const ride = await query(
    `
      select ${RIDE_FIELDS}
      from public.rides
      where id = $1::uuid
      limit 1
    `,
    [id],
  );

  if (!ride.rows[0]) return Response.json({ error: "Ride not found" }, { status: 404 });
  if (auth.kind === "driver" && ride.rows[0].driver_id !== auth.driver.driverId) {
    return Response.json({ error: "Driver cannot read another driver's ride" }, { status: 403 });
  }
  return Response.json(ride.rows[0]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUuid = (uuid: string) => UUID_REGEX.test(uuid);

  if (!isValidUuid(id)) {
    return Response.json({ error: "Invalid ID format" }, { status: 400 });
  }
  const body = await request.json();
  const { odometer_start_km, odometer_end_km } = body;

  if (odometer_start_km === undefined && odometer_end_km === undefined) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const startProvided = odometer_start_km !== undefined;
  const endProvided = odometer_end_km !== undefined;
  if (startProvided && (typeof odometer_start_km !== "number" || !Number.isFinite(odometer_start_km))) {
    return Response.json({ error: "odometer_start_km must be a number" }, { status: 422 });
  }
  if (endProvided && (typeof odometer_end_km !== "number" || !Number.isFinite(odometer_end_km))) {
    return Response.json({ error: "odometer_end_km must be a number" }, { status: 422 });
  }
  if ((startProvided && odometer_start_km < 0) || (endProvided && odometer_end_km < 0)) {
    return Response.json({ error: "odometer values must be non-negative" }, { status: 422 });
  }

  const updated = await transaction(async (client) => {
    const currentResult = await client.query<RideState>(
      `
        select driver_id, odometer_start_km, odometer_end_km
        from public.rides
        where id = $1::uuid
        for update
      `,
      [id],
    );

    const current = currentResult.rows[0];
    if (!current) return null;
    if (auth.kind === "driver" && current.driver_id !== auth.driver.driverId) {
      return { forbidden: true } as const;
    }

    const finalStart = startProvided ? odometer_start_km : current.odometer_start_km === null ? null : Number(current.odometer_start_km);
    const finalEnd = endProvided ? odometer_end_km : current.odometer_end_km === null ? null : Number(current.odometer_end_km);
    if (finalStart !== null && finalEnd !== null && finalEnd < finalStart) {
      return { invalidOdometer: "odometer_end_km must be greater than or equal to odometer_start_km" } as const;
    }

    const patch: Record<string, unknown> = {};
    if (startProvided) patch.odometer_start_km = odometer_start_km;
    if (endProvided) patch.odometer_end_km = odometer_end_km;

    const assignments = Object.keys(patch).map((field, index) => `${field} = $${index + 2}`);
    const result = await client.query(
      `
        update public.rides
        set ${assignments.join(", ")}
        where id = $1::uuid
        returning ${RIDE_FIELDS}
      `,
      [id, ...Object.values(patch)],
    );

    return { ride: result.rows[0] } as const;
  });

  if (!updated) return Response.json({ error: "Ride not found" }, { status: 404 });
  if ("forbidden" in updated) {
    return Response.json({ error: "Driver cannot update another driver's ride" }, { status: 403 });
  }
  if ("invalidOdometer" in updated) {
    return Response.json({ error: updated.invalidOdometer }, { status: 422 });
  }
  return Response.json(updated.ride);
}
