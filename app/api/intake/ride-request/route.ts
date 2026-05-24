import { validateIntakeRideRequestInput } from "@/lib/intake-contract";
import { createSupabaseClient } from "@/lib/supabase";
import { supabaseErrorResponse } from "@/lib/api-errors";

function getCommboxApiKey(): string | null {
  const value = process.env.COMMBOX_INTAKE_API_KEY?.trim();
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-commbox-api-key";
  }

  return null;
}

function verifyBearerToken(request: Request): { ok: true } | { ok: false; error: string } {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { ok: false, error: "Missing Authorization header" };
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { ok: false, error: "Authorization header must be: Bearer <api-key>" };
  }

  const expectedToken = getCommboxApiKey();
  if (!expectedToken) {
    return { ok: false, error: "COMMBOX_INTAKE_API_KEY is required in production" };
  }

  if (token !== expectedToken) {
    return { ok: false, error: "Invalid API key" };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const authResult = verifyBearerToken(request);
  if (!authResult.ok) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validation = validateIntakeRideRequestInput(parsedBody);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createSupabaseClient();

  const { data, error } = await supabase.rpc("create_intake_ride_request", {
    p_caller_full_name: validation.data.caller_full_name,
    p_caller_id_number: validation.data.caller_id_number,
    p_caller_phone: validation.data.caller_phone,
    p_request_for_self: validation.data.request_for_self,
    p_passenger_full_name: validation.data.passenger?.full_name ?? null,
    p_passenger_national_id: validation.data.passenger?.national_id ?? null,
    p_passenger_phone: validation.data.passenger?.phone ?? null,
    p_passenger_emergency_contact: validation.data.passenger?.emergency_contact ?? null,
    p_passenger_mobility_need: validation.data.passenger?.mobility_need ?? (validation.data.request_for_self ? "walking" : null),
    p_passenger_category: validation.data.passenger?.category ?? validation.data.category ?? null,
    p_trip_type: validation.data.trip_type,
    p_source_address: validation.data.source_address,
    p_destination_address: validation.data.destination_address,
    p_requested_pickup_at: validation.data.requested_pickup_at ?? null,
    p_requested_arrival_at: validation.data.requested_arrival_at ?? null,
    p_estimated_departure_at: validation.data.estimated_departure_at ?? null,
    p_waiting_time_minutes: validation.data.waiting_time_minutes ?? null,
    p_leisure_window_start: validation.data.leisure_window_start ?? null,
    p_leisure_window_end: validation.data.leisure_window_end ?? null,
    p_return_trip_required: validation.data.return_trip_required,
    p_service_zone_id: validation.data.service_zone_id ?? null,
  });

  if (error) {
    if (error.code === "23503" || error.code === "23514" || error.code === "22P02") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return supabaseErrorResponse(error);
  }

  const created = Array.isArray(data) ? data[0] : data;
  if (!created?.ride_request_id || !created?.passenger_id) {
    return Response.json({ error: "Intake request was not created" }, { status: 500 });
  }

  return Response.json(
    {
      ride_request_id: created.ride_request_id,
      passenger_id: created.passenger_id,
      status: created.status,
    },
    { status: 201 },
  );
}
