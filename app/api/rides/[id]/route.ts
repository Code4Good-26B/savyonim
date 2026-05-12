import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("rides")
    .select(RIDE_FIELDS)
    .eq("id", id)
    .single();

  if (error) return supabaseErrorResponse(error, 404);
  return Response.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("rides")
    .update(patch)
    .eq("id", id)
    .select(RIDE_FIELDS)
    .single();

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}
