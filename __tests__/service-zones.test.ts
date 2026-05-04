import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/lib/supabase");

// Builds a chainable mock where any method call returns itself,
// and awaiting the chain resolves to `result`.
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

function mockDB(result: { data?: unknown; error?: { message: string } | null }) {
  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: () => chain(result),
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/service-zones ───────────────────────────────────────────────────
describe("GET /api/service-zones", () => {
  it("returns list of zones", async () => {
    const zones = [{ id: "z1", name: "North", region_code: "N", is_active: true }];
    mockDB({ data: zones, error: null });

    const { GET } = await import("@/app/api/service-zones/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(zones);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ data: null, error: { message: "connection failed" } });

    const { GET } = await import("@/app/api/service-zones/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("connection failed");
  });
});

// ─── POST /api/service-zones ──────────────────────────────────────────────────
describe("POST /api/service-zones", () => {
  it("creates a zone and returns 201", async () => {
    const created = { id: "z2", name: "South", region_code: "S", is_active: true };
    mockDB({ data: created, error: null });

    const { POST } = await import("@/app/api/service-zones/route");
    const req = new Request("http://localhost/api/service-zones", {
      method: "POST",
      body: JSON.stringify({ name: "South", region_code: "S" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(created);
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/app/api/service-zones/route");
    const req = new Request("http://localhost/api/service-zones", {
      method: "POST",
      body: JSON.stringify({ region_code: "S" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("name is required");
  });
});

// ─── GET /api/service-zones/[id] ─────────────────────────────────────────────
describe("GET /api/service-zones/[id]", () => {
  it("returns single zone", async () => {
    const zone = { id: "z1", name: "North", region_code: "N", is_active: true };
    mockDB({ data: zone, error: null });

    const { GET } = await import("@/app/api/service-zones/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/service-zones/z1"),
      { params: Promise.resolve({ id: "z1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(zone);
  });

  it("returns 404 on DB error", async () => {
    mockDB({ data: null, error: { message: "not found" } });

    const { GET } = await import("@/app/api/service-zones/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/service-zones/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/service-zones/[id] ─────────────────────────────────────────────
describe("PUT /api/service-zones/[id]", () => {
  it("updates zone and returns updated record", async () => {
    const updated = { id: "z1", name: "Updated", region_code: "N", is_active: true };
    mockDB({ data: updated, error: null });

    const { PUT } = await import("@/app/api/service-zones/[id]/route");
    const res = await PUT(
      new Request("http://localhost/api/service-zones/z1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "z1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Updated");
  });

  it("returns 400 when body is empty", async () => {
    const { PUT } = await import("@/app/api/service-zones/[id]/route");
    const res = await PUT(
      new Request("http://localhost/api/service-zones/z1", {
        method: "PUT",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "z1" }) }
    );

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/service-zones/[id] ──────────────────────────────────────────
describe("DELETE /api/service-zones/[id]", () => {
  it("returns 204 on success", async () => {
    mockDB({ error: null });

    const { DELETE } = await import("@/app/api/service-zones/[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/service-zones/z1"),
      { params: Promise.resolve({ id: "z1" }) }
    );

    expect(res.status).toBe(204);
  });
});
