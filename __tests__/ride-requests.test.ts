import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/lib/supabase");
vi.mock("@/lib/api-auth", () => ({
  requireBearerAuth: () => ({ ok: true, token: "test-token", kind: "user", claims: { sub: "test-user", exp: 9999999999 } }),
}));

function chain(result: object) {
  const handler: ProxyHandler<object> = {
    get(_, prop: string) {
      if (prop === "then")
        return (res: unknown, rej: unknown) =>
          Promise.resolve(result).then(res as never, rej as never);
      if (prop === "catch")
        return (rej: unknown) => Promise.resolve(result).catch(rej as never);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

function mockDB(result: { data?: unknown; error?: { message: string; code?: string } | null }) {
  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: () => chain(result),
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

// Status PATCH needs two from() calls: fetch current status, then update.
function mockStatusPatch({
  current,
  updated,
}: {
  current: { data?: unknown; error?: { message: string } | null };
  updated?: { data?: unknown; error?: { message: string } | null };
}) {
  const fromMock = vi.fn()
    .mockReturnValueOnce(chain(current))
    .mockReturnValueOnce(chain(updated ?? { data: null, error: null }));

  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: fromMock,
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

const BASE_REQUEST = {
  id: "rr1",
  passenger_id: "p1",
  requested_by_user_id: "u1",
  service_zone_id: null,
  status: "pending",
  source_address: "123 Main St",
  source_notes: null,
  destination_address: "456 Elm St",
  destination_notes: null,
  return_trip_required: false,
  requested_pickup_at: "2026-05-10T10:00:00.000Z",
  caller_full_name: null,
  caller_id_number: null,
  caller_phone: null,
  request_for_self: false,
  trip_type: null,
  requested_arrival_at: null,
  estimated_departure_at: null,
  waiting_time_minutes: null,
  leisure_window_start: null,
  leisure_window_end: null,
  approved_at: null,
  assigned_at: null,
  started_at: null,
  completed_at: null,
  rejected_at: null,
  rejection_reason: null,
};

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/ride-requests ───────────────────────────────────────────────────
describe("GET /api/ride-requests", () => {
  it("returns list of ride requests", async () => {
    mockDB({ data: [BASE_REQUEST], error: null });

    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([BASE_REQUEST]);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ data: null, error: { message: "connection failed" } });

    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests"));

    expect(res.status).toBe(500);
  });

  it("accepts valid status filter", async () => {
    mockDB({ data: [BASE_REQUEST], error: null });

    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests?status=pending"));

    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status filter", async () => {
    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests?status=flying"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid status/);
  });

  it("accepts valid date filter", async () => {
    mockDB({ data: [BASE_REQUEST], error: null });

    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests?date=2026-05-10"));

    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid date format", async () => {
    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests?date=10-05-2026"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid date format/);
  });

  it("accepts valid trip_type filter", async () => {
    mockDB({ data: [BASE_REQUEST], error: null });

    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests?trip_type=medical"));

    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid trip_type filter", async () => {
    const { GET } = await import("@/app/api/ride-requests/route");
    const res = await GET(new Request("http://localhost/api/ride-requests?trip_type=urgent"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid trip_type/);
  });
});

// ─── POST /api/ride-requests ──────────────────────────────────────────────────
describe("POST /api/ride-requests", () => {
  it("creates a ride request and returns 201", async () => {
    mockDB({ data: BASE_REQUEST, error: null });

    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "123 Main St",
          destination_address: "456 Elm St",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).passenger_id).toBe("p1");
  });

  it("returns 400 when passenger_id is missing", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({ source_address: "A", destination_address: "B" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("passenger_id is required");
  });

  it("returns 400 when trip_type is invalid", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          trip_type: "urgent",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid trip_type/);
  });

  it("returns 400 when source_address is missing", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({ passenger_id: "p1", destination_address: "B" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("source_address is required");
  });

  it("returns 400 when destination_address is missing", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({ passenger_id: "p1", source_address: "A" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("destination_address is required");
  });

  it("returns 400 for invalid requested_pickup_at", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          requested_pickup_at: "not-a-date",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid requested_pickup_at/);
  });

  it("returns 400 for invalid requested_arrival_at", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          requested_arrival_at: "bad-date",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid requested_arrival_at/);
  });

  it("returns 400 when medical trip is missing requested_arrival_at", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          trip_type: "medical",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/requested_arrival_at is required/);
  });

  it("returns 400 when leisure trip is missing window", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          trip_type: "leisure",
          leisure_window_start: "10:00",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/leisure_window_start and leisure_window_end are required/);
  });

  it("returns 400 when leisure end is before start", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          trip_type: "leisure",
          leisure_window_start: "12:00",
          leisure_window_end: "10:00",
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/leisure_window_end must be after leisure_window_start/);
  });

  it("returns 400 when waiting_time_minutes is non-positive", async () => {
    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          waiting_time_minutes: 0,
        }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/waiting_time_minutes must be a positive integer/);
  });

  it("accepts valid requested_pickup_at", async () => {
    mockDB({ data: { ...BASE_REQUEST, requested_pickup_at: "2026-05-10T10:00:00.000Z" }, error: null });

    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          requested_pickup_at: "2026-05-10T10:00:00.000Z",
        }),
      })
    );

    expect(res.status).toBe(201);
  });

  it("creates an enriched medical ride request and returns 201", async () => {
    mockDB({
      data: {
        ...BASE_REQUEST,
        trip_type: "medical",
        request_for_self: true,
        caller_full_name: "Caller Name",
        caller_id_number: "123456789",
        caller_phone: "050-1111111",
        requested_arrival_at: "2026-05-10T10:30:00.000Z",
        waiting_time_minutes: 30,
      },
      error: null,
    });

    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({
          passenger_id: "p1",
          source_address: "A",
          destination_address: "B",
          trip_type: "medical",
          request_for_self: true,
          caller_full_name: "Caller Name",
          caller_id_number: "123456789",
          caller_phone: "050-1111111",
          requested_arrival_at: "2026-05-10T10:30:00.000Z",
          waiting_time_minutes: 30,
        }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).trip_type).toBe("medical");
  });

  it("returns 400 when passenger_id does not exist", async () => {
    mockDB({ data: null, error: { message: "foreign key violation", code: "23503" } });

    const { POST } = await import("@/app/api/ride-requests/route");
    const res = await POST(
      new Request("http://localhost/api/ride-requests", {
        method: "POST",
        body: JSON.stringify({ passenger_id: "bad", source_address: "A", destination_address: "B" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/service_zone_id/);
  });
});

// ─── PATCH /api/ride-requests/[id]/status ────────────────────────────────────
describe("PATCH /api/ride-requests/[id]/status", () => {
  it("transitions pending → approved", async () => {
    const updated = { ...BASE_REQUEST, status: "approved", approved_at: "2026-05-07T10:00:00.000Z" };
    mockStatusPatch({
      current: { data: { status: "pending" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
  });

  it("transitions approved → waiting_for_representitive", async () => {
    const updated = { ...BASE_REQUEST, status: "waiting_for_representitive" };
    mockStatusPatch({
      current: { data: { status: "approved" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "waiting_for_representitive" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(200);
  });

  it("transitions waiting_for_representitive → in_progress", async () => {
    const updated = { ...BASE_REQUEST, status: "in_progress", started_at: "2026-05-07T11:00:00.000Z" };
    mockStatusPatch({
      current: { data: { status: "waiting_for_representitive" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("in_progress");
  });

  it("transitions in_progress → completed", async () => {
    const updated = { ...BASE_REQUEST, status: "completed", completed_at: "2026-05-07T12:00:00.000Z" };
    mockStatusPatch({
      current: { data: { status: "in_progress" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("completed");
  });

  it("transitions pending → rejected with rejection_reason", async () => {
    const updated = { ...BASE_REQUEST, status: "rejected", rejected_at: "2026-05-07T10:00:00.000Z", rejection_reason: "No drivers" };
    mockStatusPatch({
      current: { data: { status: "pending" }, error: null },
      updated: { data: updated, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: "No drivers" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).rejection_reason).toBe("No drivers");
  });

  it("returns 400 when rejection_reason is missing for rejected status", async () => {
    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/rejection_reason is required/);
  });

  it("returns 422 for invalid transition pending → completed", async () => {
    mockStatusPatch({
      current: { data: { status: "pending" }, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/Invalid transition/);
  });

  it("returns 422 for invalid transition pending → in_progress", async () => {
    mockStatusPatch({
      current: { data: { status: "pending" }, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(422);
  });

  it("returns 422 when status is already completed", async () => {
    mockStatusPatch({
      current: { data: { status: "completed" }, error: null },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: "oops" }),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(422);
  });

  it("returns 400 when status field is missing", async () => {
    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/rr1/status", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "rr1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("status is required");
  });

  it("returns 404 when ride request not found", async () => {
    mockStatusPatch({
      current: { data: null, error: { message: "not found" } },
    });

    const { PATCH } = await import("@/app/api/ride-requests/[id]/status/route");
    const res = await PATCH(
      new Request("http://localhost/api/ride-requests/missing/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});
