import { createSupabaseClient } from "@/lib/supabase";

const RIDE_REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  approved: ["waiting_for_representitive", "rejected"],
  waiting_for_representitive: ["in_progress", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

const STATUS_TIMESTAMPS: Record<string, string> = {
  approved: "approved_at",
  in_progress: "started_at",
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
    .from("ride_requests")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) return Response.json({ error: "Ride request not found" }, { status: 404 });

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
    .from("ride_requests")
    .update(patch)
    .eq("id", id)
    .select(RIDE_REQUEST_FIELDS)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
