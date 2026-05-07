import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/lib/supabase");

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

const BASE_DRIVER = {
  id: "d1",
  user_id: "u1",
  contact_phone: "050-1234567",
  service_zone_id: "z1",
  is_active: true,
};

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/drivers ─────────────────────────────────────────────────────────
describe("GET /api/drivers", () => {
  it("returns list of drivers", async () => {
    mockDB({ data: [BASE_DRIVER], error: null });

    const { GET } = await import("@/app/api/drivers/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([BASE_DRIVER]);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ data: null, error: { message: "connection failed" } });

    const { GET } = await import("@/app/api/drivers/route");
    const res = await GET();

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/drivers ────────────────────────────────────────────────────────
describe("POST /api/drivers", () => {
  it("creates a driver and returns 201", async () => {
    mockDB({ data: BASE_DRIVER, error: null });

    const { POST } = await import("@/app/api/drivers/route");
    const res = await POST(
      new Request("http://localhost/api/drivers", {
        method: "POST",
        body: JSON.stringify({ user_id: "u1", contact_phone: "050-1234567", service_zone_id: "z1" }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).user_id).toBe("u1");
  });

  it("returns 400 when user_id is missing", async () => {
    const { POST } = await import("@/app/api/drivers/route");
    const res = await POST(
      new Request("http://localhost/api/drivers", {
        method: "POST",
        body: JSON.stringify({ contact_phone: "050-1234567" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("user_id is required");
  });

  it("returns 409 when user_id already has a driver profile", async () => {
    mockDB({ data: null, error: { message: "duplicate key", code: "23505" } });

    const { POST } = await import("@/app/api/drivers/route");
    const res = await POST(
      new Request("http://localhost/api/drivers", {
        method: "POST",
        body: JSON.stringify({ user_id: "u1" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("user_id already has a driver profile");
  });

  it("returns 400 when user_id or service_zone_id does not exist", async () => {
    mockDB({ data: null, error: { message: "foreign key violation", code: "23503" } });

    const { POST } = await import("@/app/api/drivers/route");
    const res = await POST(
      new Request("http://localhost/api/drivers", {
        method: "POST",
        body: JSON.stringify({ user_id: "nonexistent" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not exist/);
  });
});

// ─── GET /api/drivers/[id] ────────────────────────────────────────────────────
describe("GET /api/drivers/[id]", () => {
  it("returns single driver", async () => {
    mockDB({ data: BASE_DRIVER, error: null });

    const { GET } = await import("@/app/api/drivers/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/drivers/d1"),
      { params: Promise.resolve({ id: "d1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(BASE_DRIVER);
  });

  it("returns 404 on DB error", async () => {
    mockDB({ data: null, error: { message: "not found" } });

    const { GET } = await import("@/app/api/drivers/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/drivers/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/drivers/[id] ──────────────────────────────────────────────────
describe("PATCH /api/drivers/[id]", () => {
  it("updates driver and returns updated record", async () => {
    const updated = { ...BASE_DRIVER, contact_phone: "052-9999999" };
    mockDB({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/drivers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/drivers/d1", {
        method: "PATCH",
        body: JSON.stringify({ contact_phone: "052-9999999" }),
      }),
      { params: Promise.resolve({ id: "d1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).contact_phone).toBe("052-9999999");
  });

  it("returns 400 when body is empty", async () => {
    const { PATCH } = await import("@/app/api/drivers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/drivers/d1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "d1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No fields to update");
  });

  it("can deactivate a driver", async () => {
    const updated = { ...BASE_DRIVER, is_active: false };
    mockDB({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/drivers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/drivers/d1", {
        method: "PATCH",
        body: JSON.stringify({ is_active: false }),
      }),
      { params: Promise.resolve({ id: "d1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).is_active).toBe(false);
  });
});

// ─── DELETE /api/drivers/[id] ─────────────────────────────────────────────────
describe("DELETE /api/drivers/[id]", () => {
  it("returns 204 on success", async () => {
    mockDB({ error: null });

    const { DELETE } = await import("@/app/api/drivers/[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/drivers/d1"),
      { params: Promise.resolve({ id: "d1" }) }
    );

    expect(res.status).toBe(204);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ error: { message: "cannot delete" } });

    const { DELETE } = await import("@/app/api/drivers/[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/drivers/d1"),
      { params: Promise.resolve({ id: "d1" }) }
    );

    expect(res.status).toBe(500);
  });
});
