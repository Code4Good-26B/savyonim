import { query } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

export async function GET(
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

  if (
    odometer_start_km !== undefined &&
    odometer_end_km !== undefined &&
    odometer_end_km < odometer_start_km
  ) {
    return Response.json(
      { error: "odometer_end_km must be greater than or equal to odometer_start_km" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (odometer_start_km !== undefined) patch.odometer_start_km = odometer_start_km;
  if (odometer_end_km !== undefined) patch.odometer_end_km = odometer_end_km;

  const assignments = Object.keys(patch).map((field, index) => `${field} = $${index + 2}`);
  const updated = await query(
    `
      update public.rides
      set ${assignments.join(", ")}
      where id = $1::uuid
      returning ${RIDE_FIELDS}
    `,
    [id, ...Object.values(patch)],
  );

  if (!updated.rows[0]) return Response.json({ error: "Ride not found" }, { status: 404 });
  return Response.json(updated.rows[0]);
}
