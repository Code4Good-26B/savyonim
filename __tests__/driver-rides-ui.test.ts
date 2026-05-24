import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "@/lib/db";
import { userMessageForStatus } from "@/lib/driver/api";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("driver ride API", () => {
  it("requires driverId for protected driver ride data", async () => {
    const { GET } = await import("@/app/api/driver/rides/route");
    const res = await GET(new Request("http://localhost/api/driver/rides"));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("driverId is required");
  });

  it("returns open and assigned rides for the requested driver", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ id: "rr1", status: "approved", source_address: "A", destination_address: "B" }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: "ride1", driver_id: "d1", status: "assigned" }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

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
