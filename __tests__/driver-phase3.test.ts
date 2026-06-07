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
const SECOND_RIDE_ID = "77777777-0000-0000-0000-000000000002";
const SECOND_RIDE_REQUEST_ID = "99999999-0000-0000-0000-000000000002";
const AMBULANCE_ID = "44444444-0000-0000-0000-000000000001";
const SECOND_AMBULANCE_ID = "44444444-0000-0000-0000-000000000002";

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

function getAuthRequest(url: string, token = driverToken()) {
  return new Request(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

function mockTransactionOnce(queryResults: unknown[]) {
  let clientRef: { query: ReturnType<typeof vi.fn> } | null = null;
  vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
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

  it("allows Driver A to accept and returns a conflict when Driver B accepts the same ride", async () => {
    const { POST } = await import("@/app/api/rides/route");
    mockTransaction([
      { rows: [{ status: "approved" }] },
      { rows: [{ ...assignedRide, driver_id: DRIVER_ID }] },
    ]);

    const driverAResponse = await POST(postAuthRequest({
      ride_request_id: RIDE_REQUEST_ID,
      ambulance_id: AMBULANCE_ID,
    }));
    expect(driverAResponse.status).toBe(201);

    mockTransaction([{ rows: [{ status: "waiting_for_representitive" }] }]);

    const driverBResponse = await POST(postAuthRequest(
      {
        ride_request_id: RIDE_REQUEST_ID,
        ambulance_id: AMBULANCE_ID,
      },
      driverToken(OTHER_DRIVER_ID, "22222222-0000-0000-0000-000000000002"),
    ));
    const body = await driverBResponse.json();

    expect(driverBResponse.status).toBe(409);
    expect(body.error).toBe("Ride request is no longer open for assignment");
  });

  it("allows the same driver to accept multiple different open rides", async () => {
    const secondAssignedRide = {
      ...assignedRide,
      id: SECOND_RIDE_ID,
      ride_request_id: SECOND_RIDE_REQUEST_ID,
      ambulance_id: SECOND_AMBULANCE_ID,
    };

    mockTransactionOnce([
      { rows: [{ status: "approved" }] },
      { rows: [assignedRide] },
    ]);
    mockTransactionOnce([
      { rows: [{ status: "approved" }] },
      { rows: [secondAssignedRide] },
    ]);

    const { POST } = await import("@/app/api/rides/route");
    const first = await POST(postAuthRequest({
      ride_request_id: RIDE_REQUEST_ID,
      ambulance_id: AMBULANCE_ID,
    }));
    const second = await POST(postAuthRequest({
      ride_request_id: SECOND_RIDE_REQUEST_ID,
      ambulance_id: SECOND_AMBULANCE_ID,
    }));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await first.json()).driver_id).toBe(DRIVER_ID);
    expect((await second.json()).driver_id).toBe(DRIVER_ID);
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

  it("completes an assigned ride and stores odometer and completed_at", async () => {
    mockCompletion(
      {
        status: "assigned",
        driver_id: DRIVER_ID,
        odometer_start_km: null,
        odometer_end_km: null,
      },
      {
        odometer_end_km: "121.5",
        completed_at: "2026-05-29T11:00:00.000Z",
      },
    );

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "completed",
        odometer_end_km: 121.5,
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.odometer_end_km).toBe("121.5");
    expect(body.completed_at).toBe("2026-05-29T11:00:00.000Z");
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
    expect((await res.json()).error).toBe("odometer_end_km is required and must be a number");
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
    expect((await res.json()).error).toBe("odometer values must be non-negative");
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
    expect((await res.json()).error).toBe("odometer_end_km must be greater than or equal to odometer_start_km");
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

describe("driver reject/cancel ride", () => {
  it("returns an assigned ride request to open rides when the driver rejects it", async () => {
    const getClient = mockTransaction([
      {
        rows: [{
          status: "assigned",
          ride_request_id: RIDE_REQUEST_ID,
          driver_id: DRIVER_ID,
          odometer_start_km: null,
          odometer_end_km: null,
        }],
      },
      {
        rows: [{
          ...assignedRide,
          status: "rejected",
          rejected_at: "2026-05-29T10:30:00.000Z",
          rejection_reason: "Schedule conflict",
        }],
      },
      { rows: [] },
    ]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "rejected",
        rejection_reason: "Schedule conflict",
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("rejected");
    expect(getClient()?.query.mock.calls[2][0]).toContain("status = 'approved'");
    expect(getClient()?.query.mock.calls[2][0]).toContain("not exists");
    expect(getClient()?.query.mock.calls[2][1]).toEqual([RIDE_REQUEST_ID]);
  });

  it("allows a rejected ride request to be accepted again by another driver", async () => {
    mockTransactionOnce([
      {
        rows: [{
          status: "assigned",
          ride_request_id: RIDE_REQUEST_ID,
          driver_id: DRIVER_ID,
          odometer_start_km: null,
          odometer_end_km: null,
        }],
      },
      {
        rows: [{
          ...assignedRide,
          status: "rejected",
          rejected_at: "2026-05-29T10:30:00.000Z",
          rejection_reason: "Schedule conflict",
        }],
      },
      { rows: [] },
    ]);
    mockTransactionOnce([
      { rows: [{ status: "approved" }] },
      {
        rows: [{
          ...assignedRide,
          id: SECOND_RIDE_ID,
          driver_id: OTHER_DRIVER_ID,
          ambulance_id: SECOND_AMBULANCE_ID,
        }],
      },
    ]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const rejected = await PATCH(
      authRequest("http://localhost/api/rides/ride-id/status", {
        status: "rejected",
        rejection_reason: "Schedule conflict",
      }),
      { params: Promise.resolve({ id: RIDE_ID }) },
    );
    expect(rejected.status).toBe(200);

    const { POST } = await import("@/app/api/rides/route");
    const acceptedAgain = await POST(postAuthRequest(
      {
        ride_request_id: RIDE_REQUEST_ID,
        ambulance_id: SECOND_AMBULANCE_ID,
      },
      driverToken(OTHER_DRIVER_ID, "22222222-0000-0000-0000-000000000002"),
    ));
    const body = await acceptedAgain.json();

    expect(acceptedAgain.status).toBe(201);
    expect(body.driver_id).toBe(OTHER_DRIVER_ID);
  });
});

describe("driver ride details and history", () => {
  it("returns passenger details for an open ride when available", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [{
          id: RIDE_REQUEST_ID,
          passenger_id: "55555555-0000-0000-0000-000000000001",
          status: "approved",
          source_address: "12 Arlozorov Street, Tel Aviv",
          destination_address: "Ichilov Hospital, Tel Aviv",
          passenger: {
            id: "55555555-0000-0000-0000-000000000001",
            full_name: "Miriam Katz",
            phone: "050-1111111",
            emergency_contact: "050-9991111",
            mobility_need: "walking",
            category: "other",
          },
        }],
      } as never);

    const { GET } = await import("@/app/api/driver/rides/[id]/route");
    const res = await GET(
      getAuthRequest(`http://localhost/api/driver/rides/${RIDE_REQUEST_ID}`),
      { params: Promise.resolve({ id: RIDE_REQUEST_ID }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.kind).toBe("open");
    expect(body.rideRequest.passenger.full_name).toBe("Miriam Katz");
    expect(body.rideRequest.passenger.phone).toBe("050-1111111");
  });

  it("returns null passenger details when passenger information is missing", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({
        rows: [{
          id: RIDE_REQUEST_ID,
          passenger_id: "55555555-0000-0000-0000-000000000001",
          status: "approved",
          source_address: "Unknown pickup",
          destination_address: "Unknown destination",
          passenger: null,
        }],
      } as never);

    const { GET } = await import("@/app/api/driver/rides/[id]/route");
    const res = await GET(
      getAuthRequest(`http://localhost/api/driver/rides/${RIDE_REQUEST_ID}`),
      { params: Promise.resolve({ id: RIDE_REQUEST_ID }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.kind).toBe("open");
    expect(body.rideRequest.passenger).toBeNull();
  });

  it("returns only completed rides in history", async () => {
    const activeRide = { ...assignedRide, id: "77777777-0000-0000-0000-000000000002", status: "assigned" };
    const completedRide = {
      ...assignedRide,
      id: "77777777-0000-0000-0000-000000000003",
      status: "completed",
      completed_at: "2026-05-29T11:00:00.000Z",
      odometer_end_km: "121.5",
    };

    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [activeRide] } as never)
      .mockResolvedValueOnce({ rows: [completedRide] } as never);

    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(getAuthRequest("http://localhost/api/driver/rides"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.assignedRides).toEqual([activeRide]);
    expect(body.rideHistory).toEqual([completedRide]);
    expect(body.rideHistory).not.toContainEqual(activeRide);
    expect(vi.mocked(db.query).mock.calls[2][0]).toContain("r.status = 'completed'");
    expect(vi.mocked(db.query).mock.calls[2][0]).not.toContain("r.status in ('completed', 'rejected')");
  });
});
