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

// The availability handler calls from() three times: rides, drivers, ambulances.
// mockReturnValueOnce ensures each call gets the right result in order.
function mockAvailability({
  rides,
  drivers,
  ambulances,
}: {
  rides: { data?: unknown; error?: { message: string } | null };
  drivers?: { data?: unknown; error?: { message: string } | null };
  ambulances?: { data?: unknown; error?: { message: string } | null };
}) {
  const fromMock = vi.fn()
    .mockReturnValueOnce(chain(rides))
    .mockReturnValueOnce(chain(drivers ?? { data: [], error: null }))
    .mockReturnValueOnce(chain(ambulances ?? { data: [], error: null }));

  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: fromMock,
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

const DRIVER_1 = { id: "d1", user_id: "u1", contact_phone: "050-1111111", service_zone_id: "z1", is_active: true };
const DRIVER_2 = { id: "d2", user_id: "u2", contact_phone: "050-2222222", service_zone_id: "z1", is_active: true };
const AMBULANCE_1 = { id: "a1", license_plate: "12-345-67", service_zone_id: "z1", is_available: true, is_active: true };
const AMBULANCE_2 = { id: "a2", license_plate: "98-765-43", service_zone_id: "z2", is_available: true, is_active: true };

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/availability ────────────────────────────────────────────────────
describe("GET /api/availability", () => {
  it("returns all active drivers and ambulances when no active rides", async () => {
    mockAvailability({
      rides: { data: [], error: null },
      drivers: { data: [DRIVER_1, DRIVER_2], error: null },
      ambulances: { data: [AMBULANCE_1, AMBULANCE_2], error: null },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toHaveLength(2);
    expect(body.ambulances).toHaveLength(2);
  });

  it("excludes driver and ambulance currently in an assigned ride", async () => {
    mockAvailability({
      rides: { data: [{ driver_id: "d1", ambulance_id: "a1" }], error: null },
      drivers: { data: [DRIVER_2], error: null },
      ambulances: { data: [AMBULANCE_2], error: null },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([DRIVER_2]);
    expect(body.ambulances).toEqual([AMBULANCE_2]);
  });

  it("excludes driver and ambulance currently in an in_progress ride", async () => {
    mockAvailability({
      rides: { data: [{ driver_id: "d2", ambulance_id: "a2" }], error: null },
      drivers: { data: [DRIVER_1], error: null },
      ambulances: { data: [AMBULANCE_1], error: null },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([DRIVER_1]);
    expect(body.ambulances).toEqual([AMBULANCE_1]);
  });

  it("returns empty lists when all resources are in active rides", async () => {
    mockAvailability({
      rides: {
        data: [
          { driver_id: "d1", ambulance_id: "a1" },
          { driver_id: "d2", ambulance_id: "a2" },
        ],
        error: null,
      },
      drivers: { data: [], error: null },
      ambulances: { data: [], error: null },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toHaveLength(0);
    expect(body.ambulances).toHaveLength(0);
  });

  it("returns 500 when rides query fails", async () => {
    mockAvailability({
      rides: { data: null, error: { message: "rides DB error" } },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("rides DB error");
  });

  it("returns 500 when drivers query fails", async () => {
    mockAvailability({
      rides: { data: [], error: null },
      drivers: { data: null, error: { message: "drivers DB error" } },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("drivers DB error");
  });

  it("returns 500 when ambulances query fails", async () => {
    mockAvailability({
      rides: { data: [], error: null },
      drivers: { data: [DRIVER_1], error: null },
      ambulances: { data: null, error: { message: "ambulances DB error" } },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("ambulances DB error");
  });

  it("handles multiple overlapping active rides correctly", async () => {
    mockAvailability({
      rides: {
        data: [
          { driver_id: "d1", ambulance_id: "a1" },
          { driver_id: "d2", ambulance_id: "a2" },
        ],
        error: null,
      },
      drivers: { data: [], error: null },
      ambulances: { data: [], error: null },
    });

    const { GET } = await import("@/app/api/availability/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drivers).toEqual([]);
    expect(body.ambulances).toEqual([]);
  });
});
