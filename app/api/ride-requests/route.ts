import { createSupabaseClient } from "@/lib/supabase";

const RIDE_REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason";

const VALID_STATUSES = [
  "pending",
  "approved",
  "waiting_for_representitive",
  "in_progress",
  "completed",
  "rejected",
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const zone = searchParams.get("zone");

  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  let query = supabase.from("ride_requests").select(RIDE_REQUEST_FIELDS).order("requested_pickup_at", { ascending: false });

  if (status) query = query.eq("status", status);

  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const end = nextDay.toISOString().slice(0, 10) + "T00:00:00.000Z";
    query = query.gte("requested_pickup_at", start).lt("requested_pickup_at", end);
  }

  if (zone) {
    query = query.eq("service_zone_id", zone);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    passenger_id,
    requested_by_user_id,
    source_address,
    source_notes,
    destination_address,
    destination_notes,
    return_trip_required = false,
    requested_pickup_at,
  } = body;

  if (!passenger_id) {
    return Response.json({ error: "passenger_id is required" }, { status: 400 });
  }
  if (!source_address) {
    return Response.json({ error: "source_address is required" }, { status: 400 });
  }
  if (!destination_address) {
    return Response.json({ error: "destination_address is required" }, { status: 400 });
  }

  if (requested_pickup_at !== undefined && isNaN(Date.parse(requested_pickup_at))) {
    return Response.json({ error: "Invalid requested_pickup_at timestamp" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({
      passenger_id,
      requested_by_user_id,
      source_address,
      source_notes,
      destination_address,
      destination_notes,
      return_trip_required,
      requested_pickup_at,
    })
    .select(RIDE_REQUEST_FIELDS)
    .single();

  if (error) {
    if (error.code === "23503") {
      return Response.json({ error: "passenger_id or requested_by_user_id does not exist" }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
