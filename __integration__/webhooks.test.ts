import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as rideRequestWebhook } from "@/app/api/webhooks/ride-request/route";
import { POST as locationUpdateWebhook } from "@/app/api/webhooks/driver-location-update/route";
import { signWebhookPayload } from "@/lib/webhook-security";
import { getAuthenticatedSupabase, signInSeedUser } from "./helpers";

const TEST_PASSENGER_PHONE = "050-9990099";
const SEED_DRIVER_ID = "33333333-0000-0000-0000-000000000001"; // Avi Cohen
const SEED_REGION_CODE = "TLV-N";

function makeWebhookRequest(
  url: string,
  body: unknown,
  overrides: Record<string, string> = {},
): Request {
  const rawBody = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const secret = process.env.COMMBOX_WEBHOOK_SECRET ?? "dev-only-commbox-secret";
  const signature = signWebhookPayload(rawBody, timestamp, secret);

  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-timestamp": timestamp,
      "x-webhook-signature": signature,
      ...overrides,
    },
    body: rawBody,
  });
}

function baseRidePayload(requestId: string) {
  return {
    request_id: requestId,
    service_zone: { region_code: SEED_REGION_CODE },
    passenger: { full_name: "Webhook Test Passenger", phone: TEST_PASSENGER_PHONE },
    trip: {
      source_address: "Webhook Test Source St",
      destination_address: "Webhook Test Dest Ave",
      return_trip_required: false,
    },
    metadata: { channel: "whatsapp" },
  };
}

describe("POST /api/webhooks/ride-request", () => {
  let adminToken: string;
  const createdRideRequestIds: string[] = [];

  beforeAll(async () => {
    adminToken = await signInSeedUser("admin.dispatch@savionim.test");
    process.env.MOCK_COMMBOX = "true";
  });

  afterAll(async () => {
    const db = getAuthenticatedSupabase(adminToken);
    if (createdRideRequestIds.length > 0) {
      await db.from("ride_requests").delete().in("id", createdRideRequestIds);
    }
    await db.from("passengers").delete().eq("phone", TEST_PASSENGER_PHONE);
  });

  it("creates a ride_request row and returns 202 with driver notification preview", async () => {
    const req = makeWebhookRequest(
      "http://localhost/api/webhooks/ride-request",
      baseRidePayload(`test-${Date.now()}`),
    );

    const res = await rideRequestWebhook(req);
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.ride_request.source_address).toBe("Webhook Test Source St");
    expect(body.ride_request.destination_address).toBe("Webhook Test Dest Ave");
    expect(body.ride_request.id).toBeDefined();
    expect(typeof body.notifications.sent).toBe("number");
    expect(typeof body.notifications.failed).toBe("number");

    createdRideRequestIds.push(body.ride_request.id);
  });

  it("reuses the same passenger_id when phone matches an existing passenger", async () => {
    const res1 = await rideRequestWebhook(
      makeWebhookRequest(
        "http://localhost/api/webhooks/ride-request",
        baseRidePayload(`test-reuse-a-${Date.now()}`),
      ),
    );
    const body1 = await res1.json();
    createdRideRequestIds.push(body1.ride_request.id);

    const res2 = await rideRequestWebhook(
      makeWebhookRequest(
        "http://localhost/api/webhooks/ride-request",
        baseRidePayload(`test-reuse-b-${Date.now()}`),
      ),
    );
    expect(res2.status).toBe(202);
    const body2 = await res2.json();
    expect(body2.ride_request.passenger_id).toBe(body1.ride_request.passenger_id);
    createdRideRequestIds.push(body2.ride_request.id);
  });

  it("returns 401 for an invalid signature", async () => {
    const rawBody = JSON.stringify(baseRidePayload("bad-sig-test"));
    const req = new Request("http://localhost/api/webhooks/ride-request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-timestamp": new Date().toISOString(),
        "x-webhook-signature":
          "sha256=0000000000000000000000000000000000000000000000000000000000000000",
      },
      body: rawBody,
    });

    const res = await rideRequestWebhook(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature headers are absent", async () => {
    const req = new Request("http://localhost/api/webhooks/ride-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseRidePayload("no-sig-test")),
    });

    const res = await rideRequestWebhook(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeWebhookRequest("http://localhost/api/webhooks/ride-request", {
      request_id: "missing-fields-test",
      // missing service_zone, passenger, trip
    });

    const res = await rideRequestWebhook(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/webhooks/driver-location-update", () => {
  it("accepts a valid location update and returns 202", async () => {
    const req = makeWebhookRequest("http://localhost/api/webhooks/driver-location-update", {
      driver_id: SEED_DRIVER_ID,
      latitude: 32.0853,
      longitude: 34.7818,
      recorded_at: new Date().toISOString(),
    });

    const res = await locationUpdateWebhook(req);
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.location_update.driver_id).toBe(SEED_DRIVER_ID);
    expect(body.location_update.latitude).toBe(32.0853);
  });

  it("returns 400 for out-of-range latitude", async () => {
    const req = makeWebhookRequest("http://localhost/api/webhooks/driver-location-update", {
      driver_id: SEED_DRIVER_ID,
      latitude: 999,
      longitude: 34.7818,
    });

    const res = await locationUpdateWebhook(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown driver_id", async () => {
    const req = makeWebhookRequest("http://localhost/api/webhooks/driver-location-update", {
      driver_id: "00000000-0000-0000-0000-000000000000",
      latitude: 32.0853,
      longitude: 34.7818,
    });

    const res = await locationUpdateWebhook(req);
    expect(res.status).toBe(404);
  });

  it("returns 401 when signature headers are absent", async () => {
    const req = new Request("http://localhost/api/webhooks/driver-location-update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        driver_id: SEED_DRIVER_ID,
        latitude: 32.0853,
        longitude: 34.7818,
      }),
    });

    const res = await locationUpdateWebhook(req);
    expect(res.status).toBe(401);
  });
});
