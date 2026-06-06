import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as db from "@/lib/db";
import { signDriverToken } from "@/lib/auth/local-auth";
import {
  acceptOpenRide,
  completeRide,
  getDriverRides,
  userMessageForStatus,
} from "@/lib/driver/api";
import type { DriverSession } from "@/lib/driver/types";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

const DRIVER_ID = "33333333-0000-0000-0000-000000000001";
const USER_ID = "22222222-0000-0000-0000-000000000001";

function driverSession(): DriverSession {
  const { token, expiresAt } = signDriverToken({
    sub: USER_ID,
    driverId: DRIVER_ID,
    email: "driver@example.test",
    role: "driver",
  });

  return {
    userId: USER_ID,
    driverId: DRIVER_ID,
    fullName: "Driver One",
    email: "driver@example.test",
    role: "driver",
    serviceZoneId: "11111111-1000-0000-0000-000000000001",
    token,
    expiresAt,
  };
}

function authRequest(url: string, token: string) {
  return new Request(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("driver ride API", () => {
  it("returns 401 when driver ride data is requested without a token", async () => {
    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(new Request("http://localhost/api/driver/rides"));

    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Authorization/);
  });

  it("returns 401 when driver ride data is requested with an invalid token", async () => {
    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(authRequest("http://localhost/api/driver/rides", "invalid.token.value"));

    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Invalid|expired/);
  });

  it("returns open and assigned rides for the authenticated driver", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: "rr1", status: "approved", source_address: "A", destination_address: "B" }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: "ride1", driver_id: DRIVER_ID, status: "assigned" }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const session = driverSession();
    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(authRequest("http://localhost/api/driver/rides", session.token ?? ""));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.openRides).toHaveLength(1);
    expect(body.assignedRides).toHaveLength(1);
    expect(vi.mocked(db.query).mock.calls[1][1]).toEqual([DRIVER_ID]);
  });
});

describe("driver API client", () => {
  it("sends the driver Authorization header for protected reads", async () => {
    const session = driverSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openRides: [], assignedRides: [], rideHistory: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getDriverRides(session);

    expect(fetchMock).toHaveBeenCalledWith("/api/driver/rides", expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: `Bearer ${session.token}`,
      }),
    }));
  });

  it("sends the driver Authorization header when accepting a ride", async () => {
    const session = driverSession();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ambulances: [{ id: "ambulance-1", service_zone_id: session.serviceZoneId }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ride-1", driver_id: DRIVER_ID, status: "assigned" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await acceptOpenRide({ rideRequestId: "ride-request-1", session });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/rides", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: `Bearer ${session.token}`,
      }),
    }));
  });

  it("uses the atomic complete endpoint with odometer data", async () => {
    const session = driverSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "ride-1", status: "completed", odometer_end_km: 120 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await completeRide({
      rideId: "ride-1",
      odometerStartKm: 100,
      odometerEndKm: 120,
      session,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rides/ride-1/status", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        odometer_start_km: 100,
        odometer_end_km: 120,
      }),
    }));
  });
});

describe("driver error UX messages", () => {
  it("maps protected action errors to user-friendly messages", () => {
    expect(userMessageForStatus(401, "missing")).toMatch(/session expired/i);
    expect(userMessageForStatus(403, "forbidden")).toMatch(/permission/i);
    expect(userMessageForStatus(409, "duplicate")).toMatch(/changed/);
    expect(userMessageForStatus(404, "missing")).toMatch(/could not be found/);
    expect(userMessageForStatus(422, "bad odometer")).toBe("bad odometer");
    expect(userMessageForStatus(500, "db down")).toMatch(/server/);
  });
});
