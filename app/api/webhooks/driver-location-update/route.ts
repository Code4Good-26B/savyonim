import { supabaseErrorResponse } from "@/lib/api-errors";
import { validateDriverLocationUpdateWebhookPayload } from "@/lib/webhook-contracts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseClient } from "@/lib/supabase";
import { getWebhookSecret, verifyWebhookSignature } from "@/lib/webhook-security";

function getWebhookLimits() {
  const limit = Number(process.env.WEBHOOK_RATE_LIMIT_MAX ?? "60");
  const windowMs = Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? "60000");

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 60,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60000,
  };
}

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: "webhook:driver-location",
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

  const validation = validateDriverLocationUpdateWebhookPayload(parsedBody);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("id")
    .eq("id", validation.data.driver_id)
    .maybeSingle();

  if (driverError) {
    return supabaseErrorResponse(driverError);
  }

  if (!driver?.id) {
    return Response.json({ error: "Unknown driver_id" }, { status: 404 });
  }

  return Response.json(
    {
      message: "Driver location update accepted (storage integration pending)",
      location_update: {
        driver_id: validation.data.driver_id,
        latitude: validation.data.latitude,
        longitude: validation.data.longitude,
        recorded_at: validation.data.recorded_at ?? new Date().toISOString(),
        ride_id: validation.data.ride_id ?? null,
        accuracy_meters: validation.data.accuracy_meters ?? null,
      },
    },
    { status: 202 },
  );
}
