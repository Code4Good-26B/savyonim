import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

const RIDE_REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, service_zone_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, caller_full_name, caller_id_number, caller_phone, request_for_self, trip_type, requested_arrival_at, estimated_departure_at, waiting_time_minutes, leisure_window_start, leisure_window_end, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason";

const VALID_STATUSES = [
  "pending",
  "approved",
  "waiting_for_representative",
  "in_progress",
  "completed",
  "rejected",
] as const;

const VALID_TRIP_TYPES = ["medical", "leisure"] as const;

function isValidTimeOfDay(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

export async function GET(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const zone = searchParams.get("zone");
  const tripType = searchParams.get("trip_type");

  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  if (tripType && !VALID_TRIP_TYPES.includes(tripType as (typeof VALID_TRIP_TYPES)[number])) {
    return Response.json(
      { error: `Invalid trip_type. Must be one of: ${VALID_TRIP_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseClient(auth.token);
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

  if (tripType) {
    query = query.eq("trip_type", tripType);
  }

  const { data, error } = await query;
  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json();
  const {
    passenger_id,
    requested_by_user_id,
    service_zone_id,
    source_address,
    source_notes,
    destination_address,
    destination_notes,
    return_trip_required = false,
    requested_pickup_at,
    caller_full_name,
    caller_id_number,
    caller_phone,
    request_for_self = false,
    trip_type,
    requested_arrival_at,
    estimated_departure_at,
    waiting_time_minutes,
    leisure_window_start,
    leisure_window_end,
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

  if (trip_type !== undefined && !VALID_TRIP_TYPES.includes(trip_type as (typeof VALID_TRIP_TYPES)[number])) {
    return Response.json(
      { error: `Invalid trip_type. Must be one of: ${VALID_TRIP_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (requested_arrival_at !== undefined && isNaN(Date.parse(requested_arrival_at))) {
    return Response.json({ error: "Invalid requested_arrival_at timestamp" }, { status: 400 });
  }

  if (estimated_departure_at !== undefined && isNaN(Date.parse(estimated_departure_at))) {
    return Response.json({ error: "Invalid estimated_departure_at timestamp" }, { status: 400 });
  }

  if (waiting_time_minutes !== undefined && (!Number.isInteger(waiting_time_minutes) || waiting_time_minutes <= 0)) {
    return Response.json({ error: "waiting_time_minutes must be a positive integer" }, { status: 400 });
  }

  if (leisure_window_start !== undefined && !isValidTimeOfDay(leisure_window_start)) {
    return Response.json({ error: "Invalid leisure_window_start. Expected HH:MM or HH:MM:SS" }, { status: 400 });
  }

  if (leisure_window_end !== undefined && !isValidTimeOfDay(leisure_window_end)) {
    return Response.json({ error: "Invalid leisure_window_end. Expected HH:MM or HH:MM:SS" }, { status: 400 });
  }

  if (trip_type === "medical" && !requested_arrival_at) {
    return Response.json({ error: "requested_arrival_at is required for medical trips" }, { status: 400 });
  }

  if (trip_type === "leisure") {
    if (!leisure_window_start || !leisure_window_end) {
      return Response.json(
        { error: "leisure_window_start and leisure_window_end are required for leisure trips" },
        { status: 400 }
      );
    }

    if (leisure_window_end <= leisure_window_start) {
      return Response.json({ error: "leisure_window_end must be after leisure_window_start" }, { status: 400 });
    }
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({
      passenger_id,
      requested_by_user_id,
      service_zone_id,
      source_address,
      source_notes,
      destination_address,
      destination_notes,
      return_trip_required,
      requested_pickup_at,
      caller_full_name,
      caller_id_number,
      caller_phone,
      request_for_self,
      trip_type,
      requested_arrival_at,
      estimated_departure_at,
      waiting_time_minutes,
      leisure_window_start,
      leisure_window_end,
    })
    .select(RIDE_REQUEST_FIELDS)
    .single();

  if (error) {
    if (error.code === "23503") {
      return Response.json({ error: "passenger_id, requested_by_user_id, or service_zone_id does not exist" }, { status: 400 });
    }
    return supabaseErrorResponse(error);
  }

  return Response.json(data, { status: 201 });
}
