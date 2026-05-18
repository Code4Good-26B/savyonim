import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";
import { userMessageForStatus } from "@/lib/driver/api";

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

beforeEach(() => vi.clearAllMocks());

describe("driver ride API", () => {
  it("requires driverId for protected driver ride data", async () => {
    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(new Request("http://localhost/api/driver/rides"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("driverId is required");
  });

  it("returns open and assigned rides for the requested driver", async () => {
    const fromMock = vi.fn()
      .mockReturnValueOnce(chain({
        data: [{ id: "rr1", status: "approved", source_address: "A", destination_address: "B" }],
        error: null,
      }))
      .mockReturnValueOnce(chain({
        data: [{ id: "ride1", driver_id: "d1", status: "assigned" }],
        error: null,
      }));

    vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
      from: fromMock,
    } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);

    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(new Request("http://localhost/api/driver/rides?driverId=d1&serviceZoneId=z1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.openRides).toHaveLength(1);
    expect(body.assignedRides).toHaveLength(1);
  });
});

describe("driver error UX messages", () => {
  it("maps conflict and transition errors to user-friendly messages", () => {
    expect(userMessageForStatus(409, "duplicate")).toMatch(/changed/);
    expect(userMessageForStatus(404, "missing")).toMatch(/could not be found/);
    expect(userMessageForStatus(422, "invalid")).toMatch(/cannot move/);
    expect(userMessageForStatus(500, "db down")).toMatch(/server/);
  });
});
