import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

const REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, service_zone_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason";

const RIDE_FIELDS =
  "id, ride_request_id, driver_id, ambulance_id, assigned_by_user_id, representitive_user_id, status, assigned_at, in_progress_at, completed_at, rejected_at, rejection_reason, odometer_start_km, odometer_end_km, ride_request:ride_requests(id, passenger_id, requested_by_user_id, service_zone_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");
  const serviceZoneId = searchParams.get("serviceZoneId");

  if (!driverId) {
    return Response.json({ error: "driverId is required" }, { status: 400 });
  }

  const supabase = createSupabaseClient();

  let openQuery = supabase
    .from("ride_requests")
    .select(REQUEST_FIELDS)
    .eq("status", "approved")
    .order("requested_pickup_at", { ascending: true });

  if (serviceZoneId) {
    openQuery = openQuery.eq("service_zone_id", serviceZoneId);
  }

  const { data: openRides, error: openError } = await openQuery;
  if (openError) return supabaseErrorResponse(openError);

  const { data: assignedRides, error: assignedError } = await supabase
    .from("rides")
    .select(RIDE_FIELDS)
    .eq("driver_id", driverId)
    .in("status", ["assigned", "in_progress"])
    .order("assigned_at", { ascending: false });

  if (assignedError) return supabaseErrorResponse(assignedError);

  return Response.json({
    openRides: openRides ?? [],
    assignedRides: assignedRides ?? [],
  });
}
