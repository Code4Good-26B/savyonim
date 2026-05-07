import { createSupabaseClient } from "@/lib/supabase";

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
  const { id } = await params;
  const body = await request.json();
  const { status: newStatus, rejection_reason } = body;

  if (!newStatus) {
    return Response.json({ error: "status is required" }, { status: 400 });
  }

  if (newStatus === "rejected" && !rejection_reason) {
    return Response.json({ error: "rejection_reason is required when rejecting" }, { status: 400 });
  }

  const supabase = createSupabaseClient();

  const { data: current, error: fetchError } = await supabase
    .from("rides")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) return Response.json({ error: "Ride not found" }, { status: 404 });

  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return Response.json(
      { error: `Invalid transition: ${current.status} → ${newStatus}` },
      { status: 422 }
    );
  }

  const patch: Record<string, unknown> = { status: newStatus };

  const timestampField = STATUS_TIMESTAMPS[newStatus];
  if (timestampField) patch[timestampField] = new Date().toISOString();

  if (newStatus === "rejected") patch.rejection_reason = rejection_reason;

  const { data, error } = await supabase
    .from("rides")
    .update(patch)
    .eq("id", id)
    .select(RIDE_FIELDS)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
