import { supabaseErrorResponse } from "@/lib/api-errors";
import { validateRideRequestWebhookPayload } from "@/lib/webhook-contracts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseClient } from "@/lib/supabase";
import { getWebhookSecret, verifyWebhookSignature } from "@/lib/webhook-security";
import { notifyDrivers } from "@/lib/commbox";

const RIDE_REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, service_zone_id, status, source_address, destination_address, requested_pickup_at, created_at";

function getWebhookLimits() {
  const limit = Number(process.env.WEBHOOK_RATE_LIMIT_MAX ?? "60");
  const windowMs = Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? "60000");

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 60,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60000,
  };
}

async function resolveServiceZoneId(
  supabase: ReturnType<typeof createSupabaseClient>,
  input: { id?: string; region_code?: string },
): Promise<{ data: string | null; error?: Response }> {
  if (input.id) {
    return { data: input.id };
  }

  if (!input.region_code) {
    return { data: null };
  }

  const { data, error } = await supabase
    .from("service_zones")
    .select("id")
    .eq("region_code", input.region_code)
    .maybeSingle();

  if (error) {
    return { data: null, error: supabaseErrorResponse(error) };
  }

  if (!data?.id) {
    return {
      data: null,
      error: Response.json(
        { error: `Unknown service zone region_code: ${input.region_code}` },
        { status: 400 },
      ),
    };
  }

  return { data: data.id };
}

async function findOrCreatePassenger(
  supabase: ReturnType<typeof createSupabaseClient>,
  passenger: {
    full_name: string;
    phone: string;
    national_id?: string;
    emergency_contact?: string;
    mobility_need?: "none" | "wheelchair" | "walker" | "cane" | "other";
    category?: string;
  },
): Promise<{ data: string | null; error?: Response }> {
  if (passenger.national_id) {
    const byNationalId = await supabase
      .from("passengers")
      .select("id")
      .eq("national_id", passenger.national_id)
      .maybeSingle();

    if (byNationalId.error) {
      return { data: null, error: supabaseErrorResponse(byNationalId.error) };
    }

    if (byNationalId.data?.id) {
      return { data: byNationalId.data.id };
    }
  }

  const byPhone = await supabase
    .from("passengers")
    .select("id")
    .eq("phone", passenger.phone)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byPhone.error) {
    return { data: null, error: supabaseErrorResponse(byPhone.error) };
  }

  if (byPhone.data?.id) {
    return { data: byPhone.data.id };
  }

  const { data, error } = await supabase
    .from("passengers")
    .insert({
      full_name: passenger.full_name,
      phone: passenger.phone,
      national_id: passenger.national_id,
      emergency_contact: passenger.emergency_contact,
      mobility_need: passenger.mobility_need,
      category: passenger.category,
    })
    .select("id")
    .single();

  if (error) {
    return { data: null, error: supabaseErrorResponse(error) };
  }

  return { data: data.id };
}

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: "webhook:ride-request",
    ...getWebhookLimits(),
  });
  if (rateLimit) {
    return rateLimit;
  }

  const rawBody = await request.text();
  const secret = getWebhookSecret();
  if (!secret) {
    return Response.json(
      { error: "COMMBOX_WEBHOOK_SECRET is required in production" },
      { status: 500 },
    );
  }

  const signatureHeader =
    request.headers.get("x-webhook-signature") ?? request.headers.get("x-commbox-signature");
  const timestampHeader =
    request.headers.get("x-webhook-timestamp") ?? request.headers.get("x-commbox-timestamp");

  const verification = verifyWebhookSignature({
    rawBody,
    timestamp: timestampHeader,
    signature: signatureHeader,
    secret,
  });

  if (!verification.ok) {
    return Response.json({ error: verification.error }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validation = validateRideRequestWebhookPayload(parsedBody);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createSupabaseClient();

  const passengerResult = await findOrCreatePassenger(supabase, validation.data.passenger);
  if (passengerResult.error || !passengerResult.data) {
    return passengerResult.error ?? Response.json({ error: "Unable to resolve passenger" }, { status: 500 });
  }

  const zoneResult = await resolveServiceZoneId(supabase, validation.data.service_zone);
  if (zoneResult.error) {
    return zoneResult.error;
  }

  const { data: rideRequest, error: insertRideRequestError } = await supabase
    .from("ride_requests")
    .insert({
      passenger_id: passengerResult.data,
      requested_by_user_id: validation.data.metadata?.representative_user_id,
      service_zone_id: zoneResult.data,
      source_address: validation.data.trip.source_address,
      source_notes: validation.data.trip.source_notes,
      destination_address: validation.data.trip.destination_address,
      destination_notes: validation.data.trip.destination_notes,
      return_trip_required: validation.data.trip.return_trip_required ?? false,
      requested_pickup_at: validation.data.trip.requested_pickup_at,
    })
    .select(RIDE_REQUEST_FIELDS)
    .single();

  if (insertRideRequestError) {
    return supabaseErrorResponse(insertRideRequestError);
  }

  const { data: availableDrivers, error: driversError } = await supabase
    .from("drivers")
    .select("id, contact_phone, service_zone_id")
    .eq("is_active", true);
  if (driversError) {
    return supabaseErrorResponse(driversError);
  }

  const drivers = availableDrivers ?? [];

  const { sent, failed } = await notifyDrivers(
    drivers.map((d) => ({
      driverId: d.id,
      phone: d.contact_phone,
      rideRequestId: rideRequest.id,
      sourceAddress: rideRequest.source_address,
      destinationAddress: rideRequest.destination_address,
      pickupAt: rideRequest.requested_pickup_at,
    })),
  );

  return Response.json(
    {
      message: "Ride request received and drivers notified",
      provider_request_id: validation.data.request_id,
      ride_request: rideRequest,
      notifications: {
        channel: validation.data.metadata?.channel ?? "whatsapp",
        sent,
        failed,
        drivers: drivers.map((d) => ({
          driver_id: d.id,
          phone: d.contact_phone,
          service_zone_id: d.service_zone_id,
        })),
      },
    },
    { status: 202 },
  );
}
