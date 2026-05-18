import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "@/lib/db";

vi.mock("@/lib/db", () => ({ query: vi.fn(), transaction: vi.fn() }));

const BASE_RIDE = {
  id: "ride1",
  ride_request_id: "rr1",
  driver_id: "d1",
  ambulance_id: "a1",
  assigned_by_user_id: "u1",
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
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [BASE_RIDE] } as never);

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({
          ride_request_id: "rr1",
          driver_id: "d1",
          ambulance_id: "a1",
          assigned_by_user_id: "u1",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).driver_id).toBe("d1");
  });

  it("returns 400 when ride_request_id is missing", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ driver_id: "d1", ambulance_id: "a1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ride_request_id is required");
  });

  it("returns 400 when driver_id is missing", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "rr1", ambulance_id: "a1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("driver_id is required");
  });

  it("returns 400 when ambulance_id is missing", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "rr1", driver_id: "d1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("ambulance_id is required");
  });

  it("returns 400 when assigned_by_user_id is missing", async () => {
    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "rr1", driver_id: "d1", ambulance_id: "a1" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("assigned_by_user_id is required");
  });

  // ── Race condition tests ───────────────────────────────────────────────────

  it("returns 409 when driver already has an active ride (race condition)", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(
      Object.assign(new Error("duplicate key"), { code: "23505", constraint: "ux_rides_active_driver" })
    );

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "rr1", driver_id: "d1", ambulance_id: "a1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Driver already has an active ride");
  });

  it("returns 409 when ambulance already has an active ride (race condition)", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(
      Object.assign(new Error("duplicate key"), { code: "23505", constraint: "ux_rides_active_ambulance" })
    );

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "rr1", driver_id: "d1", ambulance_id: "a1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Ambulance already has an active ride");
  });

  it("returns 409 when ride request already has an active assignment (race condition)", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(
      Object.assign(new Error("duplicate key"), { code: "23505", constraint: "ux_rides_active_request" })
    );

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "rr1", driver_id: "d1", ambulance_id: "a1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Ride request already has an active assignment");
  });

  it("returns 400 when referenced IDs do not exist", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(
      Object.assign(new Error("foreign key violation"), { code: "23503" })
    );

    const { POST } = await import("@/app/api/rides/route");
    const res = await POST(
      new Request("http://localhost/api/rides", {
        method: "POST",
        body: JSON.stringify({ ride_request_id: "bad", driver_id: "d1", ambulance_id: "a1", assigned_by_user_id: "u1" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/do not exist/);
  });
});

// ─── GET /api/rides/[id] ──────────────────────────────────────────────────────
describe("GET /api/rides/[id]", () => {
  it("returns single ride", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [BASE_RIDE] } as never);

    const { GET } = await import("@/app/api/rides/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/rides/ride1"),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(BASE_RIDE);
  });

  it("returns 404 on DB error", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] } as never);

    const { GET } = await import("@/app/api/rides/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/rides/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/rides/[id] (odometer) ────────────────────────────────────────
describe("PATCH /api/rides/[id] (odometer)", () => {
  it("updates odometer_start_km", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [{ ...BASE_RIDE, odometer_start_km: 12345.0 }] } as never);

    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1", {
        method: "PATCH",
        body: JSON.stringify({ odometer_start_km: 12345.0 }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).odometer_start_km).toBe(12345.0);
  });

  it("updates odometer_end_km", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [{ ...BASE_RIDE, odometer_start_km: 12345.0, odometer_end_km: 12360.0 }] } as never);

    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1", {
        method: "PATCH",
        body: JSON.stringify({ odometer_end_km: 12360.0 }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).odometer_end_km).toBe(12360.0);
  });

  it("returns 400 when end is less than start", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1", {
        method: "PATCH",
        body: JSON.stringify({ odometer_start_km: 12360.0, odometer_end_km: 12300.0 }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/odometer_end_km must be/);
  });

  it("returns 400 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No fields to update");
  });
});

// ─── PATCH /api/rides/[id]/status ────────────────────────────────────────────
describe("PATCH /api/rides/[id]/status", () => {
  function mockTransaction(currentRows: unknown[], updatedRows?: unknown[]) {
    vi.mocked(db.transaction).mockImplementationOnce(async (callback) => {
      const clientQuery = vi.fn()
        .mockResolvedValueOnce({ rows: currentRows })
        .mockResolvedValueOnce({ rows: updatedRows ?? [] });
      return callback({ query: clientQuery } as never);
    });
  }

  it("transitions assigned → in_progress", async () => {
    const updated = { ...BASE_RIDE, status: "in_progress", in_progress_at: "2026-05-07T11:00:00.000Z" };
    mockTransaction([{ status: "assigned" }], [updated]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("in_progress");
  });

  it("transitions in_progress → completed", async () => {
    const updated = { ...BASE_RIDE, status: "completed", completed_at: "2026-05-07T12:00:00.000Z" };
    mockTransaction([{ status: "in_progress" }], [updated]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("completed");
  });

  it("transitions assigned → rejected with rejection_reason", async () => {
    const updated = { ...BASE_RIDE, status: "rejected", rejected_at: "2026-05-07T10:30:00.000Z", rejection_reason: "Driver unavailable" };
    mockTransaction([{ status: "assigned" }], [updated]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: "Driver unavailable" }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).rejection_reason).toBe("Driver unavailable");
  });

  it("returns 400 when status is missing", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("status is required");
  });

  it("returns 400 when rejecting without rejection_reason", async () => {
    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rejection_reason is required/);
  });

  it("returns 422 for invalid transition assigned → completed", async () => {
    mockTransaction([{ status: "assigned" }]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/Invalid transition/);
  });

  it("returns 422 when ride is already completed", async () => {
    mockTransaction([{ status: "completed" }]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/ride1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: "oops" }),
      }),
      { params: Promise.resolve({ id: "ride1" }) }
    );

    expect(res.status).toBe(422);
  });

  it("returns 404 when ride not found", async () => {
    mockTransaction([]);

    const { PATCH } = await import("@/app/api/rides/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/rides/missing/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});
