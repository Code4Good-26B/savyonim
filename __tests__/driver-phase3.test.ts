import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "@/lib/db";
import { signDriverToken } from "@/lib/auth/local-auth";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

const DRIVER_ID = "33333333-0000-0000-0000-000000000001";
const OTHER_DRIVER_ID = "33333333-0000-0000-0000-000000000002";
const USER_ID = "22222222-0000-0000-0000-000000000001";
const RIDE_ID = "77777777-0000-0000-0000-000000000001";
const RIDE_REQUEST_ID = "99999999-0000-0000-0000-000000000001";
const AMBULANCE_ID = "44444444-0000-0000-0000-000000000001";

function driverToken(driverId = DRIVER_ID, userId = USER_ID) {
  return signDriverToken({
    sub: userId,
    driverId,
    email: "driver@example.test",
    role: "driver",
  }).token;
}

function authRequest(url: string, body: Record<string, unknown>, token = driverToken()) {
  return new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function postAuthRequest(body: Record<string, unknown>, token = driverToken()) {
  return new Request("http://localhost/api/rides", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function mockTransaction(queryResults: unknown[]) {
  let clientRef: { query: ReturnType<typeof vi.fn> } | null = null;
  vi.mocked(db.transaction).mockImplementation(async (callback) => {
    const client = {
      query: vi.fn(),
    };
    clientRef = client;

    for (const result of queryResults) {
      client.query.mockResolvedValueOnce(result);
    }

    return callback(client as never);
  });
  return () => clientRef;
}

const assignedRide = {
  id: RIDE_ID,
  ride_request_id: RIDE_REQUEST_ID,
  driver_id: DRIVER_ID,
  ambulance_id: AMBULANCE_ID,
  assigned_by_user_id: USER_ID,
  representitive_user_id: null,
  status: "assigned",
  assigned_at: "2026-05-29T10:00:00.000Z",
  in_progress_at: null,
  completed_at: null,
  rejected_at: null,
  rejection_reason: null,
  odometer_start_km: null,
  odometer_end_km: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("driver accept ride", () => {
  it("creates an assigned ride as the authenticated driver, ignoring a spoofed driver_id", async () => {
    const getClient = mockTransaction([
      { rows: [{ status: "approved" }] },
      { rows: [{ ...assignedRide, driver_id: DRIVER_ID }] },
    ]);

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(postAuthRequest({
      ride_request_id: RIDE_REQUEST_ID,
      driver_id: OTHER_DRIVER_ID,
      ambulance_id: AMBULANCE_ID,
      assigned_by_user_id: "22222222-0000-0000-0000-000000000999",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.driver_id).toBe(DRIVER_ID);
    expect(getClient()?.query.mock.calls[1][1]).toEqual([
      RIDE_REQUEST_ID,
      DRIVER_ID,
      AMBULANCE_ID,
      USER_ID,
      undefined,
    ]);
  });

  it("returns 401 when accepting without a token", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(new Request("http://localhost/api/rides", {
      method: "POST",
      body: JSON.stringify({
        ride_request_id: RIDE_REQUEST_ID,
        ambulance_id: AMBULANCE_ID,
      }),
    }));

    expect(res.status).toBe(401);
  });

  it("returns 409 when the ride request is no longer approved", async () => {
    mockTransaction([{ rows: [{ status: "waiting_for_representitive" }] }]);

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(postAuthRequest({
      ride_request_id: RIDE_REQUEST_ID,
      ambulance_id: AMBULANCE_ID,
    }));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no longer open/);
  });

  it("returns 409 when the ride was already assigned by a concurrent accept", async () => {
    vi.mocked(db.transaction).mockRejectedValueOnce({
      code: "23505",
      constraint: "ux_rides_active_request",
    });

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(postAuthRequest({
      ride_request_id: RIDE_REQUEST_ID,
      ambulance_id: AMBULANCE_ID,
    }));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/active assignment/);
  });
});

describe("driver complete ride with odometer", () => {
  function mockCompletion(current: Record<string, unknown>, updated = {}) {
    mockTransaction([
      { rows: [current] },
      {
        rows: [{
          ...assignedRide,
          ...updated,
          status: "completed",
          completed_at: "2026-05-29T11:00:00.000Z",
        }],
      },
    ]);
  }

  it("completes a ride with a valid odometer in one transaction", async () => {
    mockCompletion(
      {
        status: "in_progress",
        driver_id: DRIVER_ID,
        odometer_start_km: "100",
        odometer_end_km: null,
      },
      { odometer_start_km: "100", odometer_end_km: "120" },
    );

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "completed",
        odometer_end_km: 120,
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it("fails completion when odometer is blank and does not run an update", async () => {
    mockTransaction([
      { rows: [{ status: "in_progress", driver_id: DRIVER_ID, odometer_start_km: "100", odometer_end_km: null }] },
    ]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", { status: "completed" }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );

    expect(res.status).toBe(422);
  });

  it("fails completion when odometer is negative", async () => {
    mockTransaction([
      { rows: [{ status: "in_progress", driver_id: DRIVER_ID, odometer_start_km: "100", odometer_end_km: null }] },
    ]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "completed",
        odometer_end_km: -1,
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );

    expect(res.status).toBe(422);
  });

  it("fails completion when end odometer is lower than start odometer", async () => {
    mockTransaction([
      { rows: [{ status: "in_progress", driver_id: DRIVER_ID, odometer_start_km: "100", odometer_end_km: null }] },
    ]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "completed",
        odometer_end_km: 99,
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );

    expect(res.status).toBe(422);
  });

  it("blocks a driver from completing another driver's ride", async () => {
    mockTransaction([
      { rows: [{ status: "in_progress", driver_id: OTHER_DRIVER_ID, odometer_start_km: "100", odometer_end_km: null }] },
    ]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "completed",
        odometer_end_km: 120,
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );

    expect(res.status).toBe(403);
  });
});
