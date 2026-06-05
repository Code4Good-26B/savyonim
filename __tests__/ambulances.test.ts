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

const BASE_AMBULANCE = {
  id: "a1",
  license_plate: "12-345-67",
  service_zone_id: "z1",
  is_available: true,
  is_active: true,
};

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/ambulances ──────────────────────────────────────────────────────
describe("GET /api/ambulances", () => {
  it("returns list of ambulances", async () => {
    mockDB({ data: [BASE_AMBULANCE], error: null });

    const { GET } = await import("@/app/api/ambulances/route");
    const res = await GET(new Request("http://localhost/api/ambulances"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([BASE_AMBULANCE]);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ data: null, error: { message: "connection failed" } });

    const { GET } = await import("@/app/api/ambulances/route");
    const res = await GET(new Request("http://localhost/api/ambulances"));

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/ambulances ─────────────────────────────────────────────────────
describe("POST /api/ambulances", () => {
  it("creates an ambulance and returns 201", async () => {
    mockDB({ data: BASE_AMBULANCE, error: null });

    const { POST } = await import("@/app/api/ambulances/route");
    const res = await POST(
      new Request("http://localhost/api/ambulances", {
        method: "POST",
        body: JSON.stringify({ license_plate: "12-345-67", service_zone_id: "z1" }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).license_plate).toBe("12-345-67");
  });

  it("returns 400 when license_plate is missing", async () => {
    const { POST } = await import("@/app/api/ambulances/route");
    const res = await POST(
      new Request("http://localhost/api/ambulances", {
        method: "POST",
        body: JSON.stringify({ service_zone_id: "z1" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("license_plate is required");
  });

  it("returns 409 when license_plate already exists", async () => {
    mockDB({ data: null, error: { message: "duplicate key", code: "23505" } });

    const { POST } = await import("@/app/api/ambulances/route");
    const res = await POST(
      new Request("http://localhost/api/ambulances", {
        method: "POST",
        body: JSON.stringify({ license_plate: "12-345-67" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("license_plate already exists");
  });

  it("returns 400 when service_zone_id does not exist", async () => {
    mockDB({ data: null, error: { message: "foreign key violation", code: "23503" } });

    const { POST } = await import("@/app/api/ambulances/route");
    const res = await POST(
      new Request("http://localhost/api/ambulances", {
        method: "POST",
        body: JSON.stringify({ license_plate: "12-345-67", service_zone_id: "nonexistent" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not exist/);
  });
});

// ─── GET /api/ambulances/[id] ─────────────────────────────────────────────────
describe("GET /api/ambulances/[id]", () => {
  it("returns single ambulance", async () => {
    mockDB({ data: BASE_AMBULANCE, error: null });

    const { GET } = await import("@/app/api/ambulances/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/ambulances/a1"),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(BASE_AMBULANCE);
  });

  it("returns 404 on DB error", async () => {
    mockDB({ data: null, error: { message: "not found", code: "PGRST116" } });

    const { GET } = await import("@/app/api/ambulances/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/ambulances/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/ambulances/[id] ───────────────────────────────────────────────
describe("PATCH /api/ambulances/[id]", () => {
  it("updates ambulance and returns updated record", async () => {
    const updated = { ...BASE_AMBULANCE, is_available: false };
    mockDB({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/ambulances/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/ambulances/a1", {
        method: "PATCH",
        body: JSON.stringify({ is_available: false }),
      }),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).is_available).toBe(false);
  });

  it("returns 400 when body is empty", async () => {
    const { PATCH } = await import("@/app/api/ambulances/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/ambulances/a1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No fields to update");
  });

  it("returns 409 when license_plate already exists", async () => {
    mockDB({ data: null, error: { message: "duplicate key", code: "23505" } });

    const { PATCH } = await import("@/app/api/ambulances/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/ambulances/a1", {
        method: "PATCH",
        body: JSON.stringify({ license_plate: "12-345-67" }),
      }),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(409);
  });

  it("can deactivate an ambulance", async () => {
    const updated = { ...BASE_AMBULANCE, is_active: false };
    mockDB({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/ambulances/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/ambulances/a1", {
        method: "PATCH",
        body: JSON.stringify({ is_active: false }),
      }),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).is_active).toBe(false);
  });
});

// ─── DELETE /api/ambulances/[id] ──────────────────────────────────────────────
describe("DELETE /api/ambulances/[id]", () => {
  it("returns 204 on success", async () => {
    mockDB({ error: null });

    const { DELETE } = await import("@/app/api/ambulances/[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/ambulances/a1"),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ error: { message: "cannot delete" } });

    const { DELETE } = await import("@/app/api/ambulances/[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/ambulances/a1"),
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(res.status).toBe(500);
  });
});
