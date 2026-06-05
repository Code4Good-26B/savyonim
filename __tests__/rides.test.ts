import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dbModule from "@/lib/db";

vi.mock("@/lib/db");
vi.mock("@/lib/api-auth", () => ({
  requireBearerAuth: () => ({ ok: true, token: "test-token", kind: "user", claims: { sub: "test-user", exp: 9999999999 } }),
}));

function mockDB(result: { data?: unknown; error?: { message: string; code?: string; constraint?: string } | null }) {
  if (result.error) {
    // Some tests don't explicitly provide constraint but provide it in message
    if (result.error.code === "23505" && !result.error.constraint && result.error.message) {
      if (result.error.message.includes("ux_rides_active_driver")) result.error.constraint = "ux_rides_active_driver";
      if (result.error.message.includes("ux_rides_active_ambulance")) result.error.constraint = "ux_rides_active_ambulance";
      if (result.error.message.includes("ux_rides_active_request")) result.error.constraint = "ux_rides_active_request";
    }
    vi.mocked(dbModule.query).mockRejectedValueOnce(result.error);
  } else {
    vi.mocked(dbModule.query).mockResolvedValueOnce({
      rows: result.data ? [result.data] : [],
      rowCount: result.data ? 1 : 0,
      command: "",
      oid: 0,
      fields: [],
    });
  }
}

function mockStatusPatch({
  current,
  updated,
}: {
  current: { data?: unknown; error?: { message: string } | null };
  updated?: { data?: unknown; error?: { message: string } | null };
}) {
  vi.mocked(dbModule.transaction).mockImplementationOnce(async (callback) => {
    const fakeClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: current.data ? [current.data] : [] })
        .mockResolvedValueOnce({ rows: updated?.data ? [updated.data] : [] })
    };
    return callback(fakeClient as never);
  });
}

function mockRidePost(result: { ride?: unknown; error?: { message: string; code?: string; constraint?: string } }) {
  if (result.error) {
    vi.mocked(dbModule.transaction).mockRejectedValueOnce(result.error);
    return;
  }

  vi.mocked(dbModule.transaction).mockImplementationOnce(async (callback) => {
    const fakeClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ status: "approved" }] })
        .mockResolvedValueOnce({ rows: result.ride ? [result.ride] : [] }),
    };
    return callback(fakeClient as never);
  });
}

function mockOdometerPatch({
  current,
  updated,
}: {
  current: { data?: unknown };
  updated?: { data?: unknown };
}) {
  vi.mocked(dbModule.transaction).mockImplementationOnce(async (callback) => {
    const fakeClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: current.data ? [current.data] : [] })
        .mockResolvedValueOnce({ rows: updated?.data ? [updated.data] : [] }),
    };
    return callback(fakeClient as never);
  });
}

const BASE_RIDE = {
  id: "55555555-5555-5555-5555-555555555555",
  ride_request_id: "11111111-1111-1111-1111-111111111111",
  driver_id: "22222222-2222-2222-2222-222222222222",
  ambulance_id: "33333333-3333-3333-3333-333333333333",
  assigned_by_user_id: "44444444-4444-4444-4444-444444444444",
  representitive_user_id: null,
  status: "assigned",
  assigned_at: "2026-05-07T10:00:00.000Z",
  in_progress_at: null,
  completed_at: null,
  rejected_at: null,
  rejection_reason: null,
  odometer_start_km: null,
  odometer_end_km: null,
};


beforeEach(() => vi.clearAllMocks());

// ─── POST /api/rides ──────────────────────────────────────────────────────────
describe("POST /api/rides", () => {
  it("creates a ride and returns 201", async () => {
    mockRidePost({ ride: BASE_RIDE });

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({
          ride_request_id: "11111111-1111-1111-1111-111111111111",
          driver_id: "22222222-2222-2222-2222-222222222222",
          ambulance_id: "33333333-3333-3333-3333-333333333333",
          assigned_by_user_id: "44444444-4444-4444-4444-444444444444",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).driver_id).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("returns 400 when ride_request_id is 66666666-6666-6666-6666-666666666666", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ driver_id: "22222222-2222-2222-2222-222222222222", ambulance_id: "33333333-3333-3333-3333-333333333333", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ride_request_id is required");
  });

  it("returns 400 when driver_id is 66666666-6666-6666-6666-666666666666", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "11111111-1111-1111-1111-111111111111", ambulance_id: "33333333-3333-3333-3333-333333333333", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("driver_id is required");
  });

  it("returns 400 when ambulance_id is 66666666-6666-6666-6666-666666666666", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "11111111-1111-1111-1111-111111111111", driver_id: "22222222-2222-2222-2222-222222222222", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ambulance_id is required");
  });

  it("returns 400 when assigned_by_user_id is 66666666-6666-6666-6666-666666666666", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "11111111-1111-1111-1111-111111111111", driver_id: "22222222-2222-2222-2222-222222222222", ambulance_id: "33333333-3333-3333-3333-333333333333" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("assigned_by_user_id is required");
  });

  // ── Race condition tests ───────────────────────────────────────────────────

  it("returns 409 when driver already has an active ride (race condition)", async () => {
    mockRidePost({
      error: {
        message: 'duplicate key value violates unique constraint "ux_rides_active_driver"',
        code: "23505",
        constraint: "ux_rides_active_driver",
      },
    });

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "11111111-1111-1111-1111-111111111111", driver_id: "22222222-2222-2222-2222-222222222222", ambulance_id: "33333333-3333-3333-3333-333333333333", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Driver already has an active ride");
  });

  it("returns 409 when ambulance already has an active ride (race condition)", async () => {
    mockRidePost({
      error: {
        message: 'duplicate key value violates unique constraint "ux_rides_active_ambulance"',
        code: "23505",
        constraint: "ux_rides_active_ambulance",
      },
    });

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "11111111-1111-1111-1111-111111111111", driver_id: "22222222-2222-2222-2222-222222222222", ambulance_id: "33333333-3333-3333-3333-333333333333", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Ambulance already has an active ride");
  });

  it("returns 409 when ride request already has an active assignment (race condition)", async () => {
    mockRidePost({
      error: {
        message: 'duplicate key value violates unique constraint "ux_rides_active_request"',
        code: "23505",
        constraint: "ux_rides_active_request",
      },
    });

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "11111111-1111-1111-1111-111111111111", driver_id: "22222222-2222-2222-2222-222222222222", ambulance_id: "33333333-3333-3333-3333-333333333333", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Ride request already has an active assignment");
  });

  it("returns 400 when referenced IDs do not exist", async () => {
    mockRidePost({ error: { message: "foreign key violation", code: "23503" } });

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "77777777-7777-7777-7777-777777777777", driver_id: "22222222-2222-2222-2222-222222222222", ambulance_id: "33333333-3333-3333-3333-333333333333", assigned_by_user_id: "44444444-4444-4444-4444-444444444444" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/do not exist/);
  });
});

// ─── GET /api/rides/[id] ──────────────────────────────────────────────────────
describe("GET /api/rides/[id]", () => {
  it("returns single ride", async () => {
    mockDB({ data: BASE_RIDE, error: null });

    const { GET } = await import("@/app/api/rides/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555"),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(BASE_RIDE);
  });

  it("returns 404 when ride not found", async () => {
    mockDB({ data: null, error: null });

    const { GET } = await import("@/app/api/rides/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/rides/66666666-6666-6666-6666-666666666666"),
      { params: Promise.resolve({ id: "66666666-6666-6666-6666-666666666666" }) }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/rides/[id] (odometer) ────────────────────────────────────────
describe("PATCH /api/rides/[id] (odometer)", () => {
  it("updates odometer_start_km", async () => {
    mockOdometerPatch({
      current: { data: BASE_RIDE },
      updated: { data: { ...BASE_RIDE, odometer_start_km: 12345.0 } },
    });

    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555", {
        method: "PATCH",
        body: JSON.stringify({ odometer_start_km: 12345.0 }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).odometer_start_km).toBe(12345.0);
  });

  it("updates odometer_end_km", async () => {
    mockOdometerPatch({
      current: { data: { ...BASE_RIDE, odometer_start_km: 12345.0 } },
      updated: { data: { ...BASE_RIDE, odometer_start_km: 12345.0, odometer_end_km: 12360.0 } },
    });

    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555", {
        method: "PATCH",
        body: JSON.stringify({ odometer_end_km: 12360.0 }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).odometer_end_km).toBe(12360.0);
  });

  it("returns 400 when end is less than start", async () => {
    mockOdometerPatch({
      current: { data: BASE_RIDE },
    });

    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555", {
        method: "PATCH",
        body: JSON.stringify({ odometer_start_km: 12360.0, odometer_end_km: 12300.0 }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/odometer_end_km must be/);
  });

  it("returns 400 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No fields to update");
  });
});

// ─── PATCH /api/rides/[id]/status ────────────────────────────────────────────
describe("PATCH /api/rides/[id]/status", () => {
  it("transitions assigned → in_progress", async () => {
    const updated = { ...BASE_RIDE, status: "in_progress", in_progress_at: "2026-05-07T11:00:00.000Z" };
    mockStatusPatch({
      current: { data: { status: "assigned" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("in_progress");
  });

  it("transitions in_progress → completed", async () => {
    const updated = { ...BASE_RIDE, status: "completed", completed_at: "2026-05-07T12:00:00.000Z", odometer_end_km: 12360.0 };
    mockStatusPatch({
      current: { data: { status: "in_progress", odometer_start_km: null, odometer_end_km: null }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", odometer_end_km: 12360.0 }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("completed");
  });

  it("transitions assigned → rejected with rejection_reason", async () => {
    const updated = { ...BASE_RIDE, status: "rejected", rejected_at: "2026-05-07T10:30:00.000Z", rejection_reason: "Driver unavailable" };
    mockStatusPatch({
      current: { data: { status: "assigned" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: "Driver unavailable" }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).rejection_reason).toBe("Driver unavailable");
  });

  it("returns 400 when status is 66666666-6666-6666-6666-666666666666", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("status is required");
  });

  it("returns 400 when rejecting without rejection_reason", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rejection_reason is required/);
  });

  it("returns 422 when completing assigned ride without odometer", async () => {
    mockStatusPatch({ current: { data: { status: "assigned", odometer_start_km: null, odometer_end_km: null }, error: null } });

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/odometer_end_km is required/);
  });

  it("returns 422 when ride is already completed", async () => {
    mockStatusPatch({ current: { data: { status: "completed" }, error: null } });

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/55555555-5555-5555-5555-555555555555/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: "oops" }),
      }),
      { params: Promise.resolve({ id: "55555555-5555-5555-5555-555555555555" }) }
    );

    expect(res.status).toBe(422);
  });

  it("returns 404 when ride not found", async () => {
    mockStatusPatch({ current: { data: null, error: { message: "not found" } } });

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/66666666-6666-6666-6666-666666666666/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "66666666-6666-6666-6666-666666666666" }) }
    );

    expect(res.status).toBe(404);
  });
});
