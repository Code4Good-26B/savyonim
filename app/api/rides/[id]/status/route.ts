import { transaction } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

const VALID_TRANSITIONS: Record<string, string[]> = {
  assigned: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

const STATUS_TIMESTAMPS: Record<string, string> = {
  in_progress: "in_progress_at",
  completed: "completed_at",
  rejected: "rejected_at",
};

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
  const { status: newStatus, rejection_reason } = body;

  if (!newStatus) {
    return Response.json({ error: "status is required" }, { status: 400 });
  }

  if (newStatus === "rejected" && !rejection_reason) {
    return Response.json({ error: "rejection_reason is required when rejecting" }, { status: 400 });
  }

  const updated = await transaction(async (client) => {
    const currentResult = await client.query<{ status: string }>(
      "select status from public.rides where id = $1::uuid limit 1",
      [id],
    );

    const current = currentResult.rows[0];
    if (!current) return null;

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return { invalidTransition: current.status };
    }

    const patch: Record<string, unknown> = { status: newStatus };

    const timestampField = STATUS_TIMESTAMPS[newStatus];
    if (timestampField) patch[timestampField] = new Date().toISOString();

    if (newStatus === "rejected") patch.rejection_reason = rejection_reason;

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

    return { ride: result.rows[0] };
  });

  if (!updated) return Response.json({ error: "Ride not found" }, { status: 404 });
  if ("invalidTransition" in updated) {
    return Response.json(
      { error: `Invalid transition: ${updated.invalidTransition} -> ${newStatus}` },
      { status: 422 },
    );
  }

  return Response.json(updated.ride);
}
