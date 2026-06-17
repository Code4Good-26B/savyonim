import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "@/lib/db";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({
  requireBearerAuth: () => ({ ok: true, token: "test-token", kind: "user", claims: { sub: "test-user", exp: 9999999999 } }),
}));

const DRIVER_1 = { id: "d1", user_id: "u1", contact_phone: "050-1111111", service_zone_id: "z1", is_active: true };
const DRIVER_2 = { id: "d2", user_id: "u2", contact_phone: "050-2222222", service_zone_id: "z1", is_active: true };
const AMBULANCE_1 = { id: "a1", license_plate: "12-345-67", service_zone_id: "z1", is_available: true, is_active: true };
const AMBULANCE_2 = { id: "a2", license_plate: "98-765-43", service_zone_id: "z2", is_available: true, is_active: true };

function mockQueries(drivers: unknown[], ambulances: unknown[]) {
  vi.mocked(db.query)
    .mockResolvedValueOnce({ rows: drivers } as never)
    .mockResolvedValueOnce({ rows: ambulances } as never);
}

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/availability ────────────────────────────────────────────────────
describe("GET /api/availability", () => {
  it("returns all active drivers and ambulances when no active rides", async () => {
    mockQueries([DRIVER_1, DRIVER_2], [AMBULANCE_1, AMBULANCE_2]);

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toHaveLength(2);
    expect(body.ambulances).toHaveLength(2);
  });

  it("keeps drivers available but excludes an ambulance currently in an assigned ride", async () => {
    mockQueries([DRIVER_1, DRIVER_2], [AMBULANCE_2]);

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([DRIVER_1, DRIVER_2]);
    expect(body.ambulances).toEqual([AMBULANCE_2]);
  });

  it("keeps drivers available but excludes an ambulance currently in an in_progress ride", async () => {
    mockQueries([DRIVER_1, DRIVER_2], [AMBULANCE_1]);

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([DRIVER_1, DRIVER_2]);
    expect(body.ambulances).toEqual([AMBULANCE_1]);
  });

  it("returns active drivers when all ambulances are in active rides", async () => {
    mockQueries([DRIVER_1, DRIVER_2], []);

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([DRIVER_1, DRIVER_2]);
    expect(body.ambulances).toHaveLength(0);
  });

  it("returns 500 when drivers query fails", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(new Error("drivers DB error"));

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("drivers DB error");
  });

  it("returns 500 when ambulances query fails", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [DRIVER_1] } as never)
      .mockRejectedValueOnce(new Error("ambulances DB error"));

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("ambulances DB error");
  });

  it("handles multiple overlapping active rides correctly", async () => {
    mockQueries([DRIVER_1, DRIVER_2], []);

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET(new Request("http://localhost/api/availability"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([DRIVER_1, DRIVER_2]);
    expect(body.ambulances).toEqual([]);
  });
});
