import { createSupabaseClient } from "@/lib/supabase";

const DRIVER_FIELDS = "id, user_id, contact_phone, service_zone_id, is_active";
const AMBULANCE_FIELDS = "id, license_plate, service_zone_id, is_available, is_active";

export async function GET() {
  const supabase = createSupabaseClient();

  const { data: activeRides, error: ridesError } = await supabase
    .from("rides")
    .select("driver_id, ambulance_id")
    .in("status", ["assigned", "in_progress"]);

  if (ridesError) return Response.json({ error: ridesError.message }, { status: 500 });

  const busyDriverIds = (activeRides ?? []).map((r) => r.driver_id);
  const busyAmbulanceIds = (activeRides ?? []).map((r) => r.ambulance_id);

  let driversQuery = supabase
    .from("drivers")
    .select(DRIVER_FIELDS)
    .eq("is_active", true);

  if (busyDriverIds.length > 0) {
    driversQuery = driversQuery.not("id", "in", `(${busyDriverIds.join(",")})`);
  }

  const { data: drivers, error: driversError } = await driversQuery;
  if (driversError) return Response.json({ error: driversError.message }, { status: 500 });

  let ambulancesQuery = supabase
    .from("ambulances")
    .select(AMBULANCE_FIELDS)
    .eq("is_active", true)
    .eq("is_available", true);

  if (busyAmbulanceIds.length > 0) {
    ambulancesQuery = ambulancesQuery.not("id", "in", `(${busyAmbulanceIds.join(",")})`);
  }

  const { data: ambulances, error: ambulancesError } = await ambulancesQuery;
  if (ambulancesError) return Response.json({ error: ambulancesError.message }, { status: 500 });

  return Response.json({ drivers, ambulances });
}
