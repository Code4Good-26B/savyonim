import { transaction } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

type RideState = {
  status: string;
  driver_id: string;
  odometer_start_km: string | null;
  odometer_end_km: string | null;
};

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
  const body = await request.json();
  const { status: newStatus, rejection_reason, odometer_start_km, odometer_end_km } = body;

  if (!newStatus) {
    return Response.json({ error: "status is required" }, { status: 400 });
  }

  if (newStatus === "rejected" && !rejection_reason) {
    return Response.json({ error: "rejection_reason is required when rejecting" }, { status: 400 });
  }

  function numberValue(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value;
  }

  const updated = await transaction(async (client) => {
    const currentResult = await client.query<RideState>(
      `
        select status, driver_id, odometer_start_km, odometer_end_km
        from public.rides
        where id = $1::uuid
        for update
      `,
      [id],
    );

    const current = currentResult.rows[0];
    if (!current) return null;
    if (auth.kind === "driver" && current.driver_id !== auth.driver.driverId) {
      return { forbidden: true };
    }

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return { invalidTransition: current.status };
    }

    const patch: Record<string, unknown> = { status: newStatus };

    if (newStatus === "completed") {
      const start =
        odometer_start_km === undefined
          ? current.odometer_start_km === null
            ? null
            : Number(current.odometer_start_km)
          : numberValue(odometer_start_km);
      const end = numberValue(odometer_end_km);

      if (end === null) {
        return { invalidOdometer: "odometer_end_km is required and must be a number" };
      }
      if (end < 0 || (start !== null && start < 0)) {
        return { invalidOdometer: "odometer values must be non-negative" };
      }
      if (start !== null && end < start) {
        return { invalidOdometer: "odometer_end_km must be greater than or equal to odometer_start_km" };
      }

      if (odometer_start_km !== undefined) patch.odometer_start_km = start;
      patch.odometer_end_km = end;
    }

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
  if ("forbidden" in updated) {
    return Response.json({ error: "Driver cannot update another driver's ride" }, { status: 403 });
  }
  if ("invalidTransition" in updated) {
    return Response.json(
      { error: `Invalid transition: ${updated.invalidTransition} -> ${newStatus}` },
      { status: 422 },
    );
  }
  if ("invalidOdometer" in updated) {
    return Response.json({ error: updated.invalidOdometer }, { status: 422 });
  }

  return Response.json(updated.ride);
}
