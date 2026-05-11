import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km";

export async function POST(request: Request) {
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

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("rides")
    .insert({ ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id })
    .select(RIDE_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("ux_rides_active_driver")) {
        return Response.json({ error: "Driver already has an active ride" }, { status: 409 });
      }
      if (error.message.includes("ux_rides_active_ambulance")) {
        return Response.json({ error: "Ambulance already has an active ride" }, { status: 409 });
      }
      if (error.message.includes("ux_rides_active_request")) {
        return Response.json({ error: "Ride request already has an active assignment" }, { status: 409 });
      }
      return Response.json({ error: "Assignment conflict" }, { status: 409 });
    }
    if (error.code === "23503") {
      return Response.json({ error: "One or more referenced IDs do not exist" }, { status: 400 });
    }
    return supabaseErrorResponse(error);
  }

  return Response.json(data, { status: 201 });
}
