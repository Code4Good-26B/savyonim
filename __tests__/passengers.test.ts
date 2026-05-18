import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";
import * as db from "@/lib/db";

vi.mock("@/lib/supabase");
vi.mock("@/lib/db", () => ({ query: vi.fn() }));

// Supabase chain mock — used by /api/passengers/[id] routes
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

function mockSupabase(result: { data?: unknown; error?: { message: string; code?: string } | null }) {
  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: () => chain(result),
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

const BASE_PASSENGER = {
  id: "p1",
  national_id: "123456789",
  full_name: "Miriam Katz",
  category: "elderly",
  mobility_need: "walker",
  mobility_notes: "needs help on stairs",
  phone: "050-1111111",
  emergency_contact: "050-9991111",
};

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/passengers ──────────────────────────────────────────────────────
describe("GET /api/passengers", () => {
  it("returns list of passengers", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [BASE_PASSENGER] } as never);

    const { GET } = await import("@/app/api/passengers/route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([BASE_PASSENGER]);
  });

  it("returns 500 on DB error", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(new Error("connection failed"));

    const { GET } = await import("@/app/api/passengers/route");
    const res = await GET();

    expect(res.status).toBe(500);
  });
});

// ─── POST /api/passengers ─────────────────────────────────────────────────────
describe("POST /api/passengers", () => {
  it("creates a passenger and returns 201", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [BASE_PASSENGER] } as never);

    const { POST } = await import("@/app/api/passengers/route");
    const res = await POST(
      new Request("http://localhost/api/passengers", {
        method: "POST",
        body: JSON.stringify({
          national_id: "123456789",
          full_name: "Miriam Katz",
          mobility_need: "walker",
          emergency_contact: "050-9991111",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect((await res.json()).full_name).toBe("Miriam Katz");
  });

  it("returns 400 when full_name is missing", async () => {
    const { POST } = await import("@/app/api/passengers/route");
    const res = await POST(
      new Request("http://localhost/api/passengers", {
        method: "POST",
        body: JSON.stringify({ national_id: "123456789" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("full_name is required");
  });

  it("returns 400 for invalid mobility_need", async () => {
    const { POST } = await import("@/app/api/passengers/route");
    const res = await POST(
      new Request("http://localhost/api/passengers", {
        method: "POST",
        body: JSON.stringify({ full_name: "Miriam Katz", mobility_need: "scooter" }),
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid mobility_need/);
  });

  it.each(["none", "wheelchair", "walker", "cane"])(
    "accepts valid mobility_need: %s",
    async (mobility_need) => {
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [{ ...BASE_PASSENGER, mobility_need }] } as never);

      const { POST } = await import("@/app/api/passengers/route");
      const res = await POST(
        new Request("http://localhost/api/passengers", {
          method: "POST",
          body: JSON.stringify({ full_name: "Test User", mobility_need }),
        })
      );

      expect(res.status).toBe(201);
    }
  );

  it("returns 409 when national_id is duplicate", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(
      Object.assign(new Error("duplicate key"), { code: "23505" })
    );

    const { POST } = await import("@/app/api/passengers/route");
    const res = await POST(
      new Request("http://localhost/api/passengers", {
        method: "POST",
        body: JSON.stringify({ full_name: "Miriam Katz", national_id: "123456789" }),
      })
    );

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("national_id already exists");
  });

  it("saves emergency_contact and mobility_notes", async () => {
    const withExtras = { ...BASE_PASSENGER, emergency_contact: "050-9991111", mobility_notes: "needs help" };
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [withExtras] } as never);

    const { POST } = await import("@/app/api/passengers/route");
    const res = await POST(
      new Request("http://localhost/api/passengers", {
        method: "POST",
        body: JSON.stringify({
          full_name: "Miriam Katz",
          emergency_contact: "050-9991111",
          mobility_notes: "needs help",
        }),
      })
    );
    const body = await res.json();

    expect(body.emergency_contact).toBe("050-9991111");
    expect(body.mobility_notes).toBe("needs help");
  });
});

// ─── GET /api/passengers/[id] ─────────────────────────────────────────────────
describe("GET /api/passengers/[id]", () => {
  it("returns single passenger", async () => {
    mockSupabase({ data: BASE_PASSENGER, error: null });

    const { GET } = await import("@/app/api/passengers/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/passengers/p1"),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(BASE_PASSENGER);
  });

  it("returns 404 on DB error", async () => {
    mockSupabase({ data: null, error: { message: "not found", code: "PGRST116" } });

    const { GET } = await import("@/app/api/passengers/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/passengers/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/passengers/[id] ───────────────────────────────────────────────
describe("PATCH /api/passengers/[id]", () => {
  it("updates passenger and returns updated record", async () => {
    const updated = { ...BASE_PASSENGER, phone: "052-9999999" };
    mockSupabase({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/passengers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/passengers/p1", {
        method: "PATCH",
        body: JSON.stringify({ phone: "052-9999999" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).phone).toBe("052-9999999");
  });

  it("returns 400 for invalid mobility_need", async () => {
    const { PATCH } = await import("@/app/api/passengers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/passengers/p1", {
        method: "PATCH",
        body: JSON.stringify({ mobility_need: "jetpack" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid mobility_need/);
  });

  it("returns 409 when national_id is duplicate", async () => {
    mockSupabase({ data: null, error: { message: "duplicate key", code: "23505" } });

    const { PATCH } = await import("@/app/api/passengers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/passengers/p1", {
        method: "PATCH",
        body: JSON.stringify({ national_id: "123456789" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(res.status).toBe(409);
  });

  it("returns 400 when body is empty", async () => {
    const { PATCH } = await import("@/app/api/passengers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/passengers/p1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(res.status).toBe(400);
  });

  it("saves updated emergency_contact and mobility_notes", async () => {
    const updated = { ...BASE_PASSENGER, emergency_contact: "054-7777777", mobility_notes: "updated notes" };
    mockSupabase({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/passengers/[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/passengers/p1", {
        method: "PATCH",
        body: JSON.stringify({ emergency_contact: "054-7777777", mobility_notes: "updated notes" }),
      }),
      { params: Promise.resolve({ id: "p1" }) }
    );
    const body = await res.json();

    expect(body.emergency_contact).toBe("054-7777777");
    expect(body.mobility_notes).toBe("updated notes");
  });
});

// ─── DELETE /api/passengers/[id] ──────────────────────────────────────────────
describe("DELETE /api/passengers/[id]", () => {
  it("returns 204 on success", async () => {
    mockSupabase({ error: null });

    const { DELETE } = await import("@/app/api/passengers/[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/passengers/p1"),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(res.status).toBe(204);
  });
});
