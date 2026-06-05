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

function mockDB(result: { data?: unknown; error?: { message: string } | null }) {
  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: () => chain(result),
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/users ───────────────────────────────────────────────────────────
describe("GET /api/users", () => {
  it("returns list of users", async () => {
    const users = [
      { id: "u1", full_name: "Avi Cohen", phone: "050-1111111", role: "driver", is_active: true },
    ];
    mockDB({ data: users, error: null });

    const { GET } = await import("@/app/api/users/route");
    const res = await GET(new Request("http://localhost/api/users"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(users);
  });

  it("returns 500 on DB error", async () => {
    mockDB({ data: null, error: { message: "query failed" } });

    const { GET } = await import("@/app/api/users/route");
    const res = await GET(new Request("http://localhost/api/users"));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("query failed");
  });
});

// ─── GET /api/users/[id] ──────────────────────────────────────────────────────
describe("GET /api/users/[id]", () => {
  it("returns single user", async () => {
    const user = { id: "u1", full_name: "Avi Cohen", role: "driver", is_active: true };
    mockDB({ data: user, error: null });

    const { GET } = await import("@/app/api/users/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/users/u1"),
      { params: Promise.resolve({ id: "u1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(user);
  });
});

// ─── PUT /api/users/[id] ──────────────────────────────────────────────────────
describe("PUT /api/users/[id]", () => {
  it("updates user successfully", async () => {
    const updated = { id: "u1", full_name: "Avi Cohen", phone: "050-9999999", role: "driver", is_active: true };
    mockDB({ data: updated, error: null });

    const { PUT } = await import("@/app/api/users/[id]/route");
    const res = await PUT(
      new Request("http://localhost/api/users/u1", {
        method: "PUT",
        body: JSON.stringify({ phone: "050-9999999" }),
      }),
      { params: Promise.resolve({ id: "u1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).phone).toBe("050-9999999");
  });

  it("returns 400 for invalid role", async () => {
    const { PUT } = await import("@/app/api/users/[id]/route");
    const res = await PUT(
      new Request("http://localhost/api/users/u1", {
        method: "PUT",
        body: JSON.stringify({ role: "superuser" }),
      }),
      { params: Promise.resolve({ id: "u1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid role/);
  });

  it.each(["admin", "dispatcher", "driver"])(
    "accepts valid role: %s",
    async (role) => {
      mockDB({ data: { id: "u1", role }, error: null });

      const { PUT } = await import("@/app/api/users/[id]/route");
      const res = await PUT(
        new Request("http://localhost/api/users/u1", {
          method: "PUT",
          body: JSON.stringify({ role }),
        }),
        { params: Promise.resolve({ id: "u1" }) }
      );

      expect(res.status).toBe(200);
    }
  );

  it("returns 400 when body is empty", async () => {
    const { PUT } = await import("@/app/api/users/[id]/route");
    const res = await PUT(
      new Request("http://localhost/api/users/u1", {
        method: "PUT",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "u1" }) }
    );

    expect(res.status).toBe(400);
  });
});
