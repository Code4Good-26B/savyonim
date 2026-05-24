import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/lib/supabase");

const rpcMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    rpc: rpcMock,
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
});

describe("POST /api/intake/ride-request", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const { POST } = await import("@/app/api/intake/ride-request/route");

    const res = await POST(
      new Request("http://localhost/api/intake/ride-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Authorization/i);
  });

  it("returns 400 for validation errors", async () => {
    const { POST } = await import("@/app/api/intake/ride-request/route");

    const res = await POST(
      new Request("http://localhost/api/intake/ride-request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dev-commbox-api-key",
        },
        body: JSON.stringify({
          caller_full_name: "Caller",
          caller_id_number: "123456789",
          caller_phone: "050-0000000",
          request_for_self: true,
          category: "other",
          trip_type: "medical",
          source_address: "A",
          destination_address: "B",
          return_trip_required: false,
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/requested_arrival_at is required/);
  });

  it("returns 201 on successful intake creation", async () => {
    rpcMock.mockResolvedValue({
      data: [{
        ride_request_id: "rr-1",
        passenger_id: "p-1",
        status: "pending",
      }],
      error: null,
    });

    const { POST } = await import("@/app/api/intake/ride-request/route");

    const res = await POST(
      new Request("http://localhost/api/intake/ride-request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dev-commbox-api-key",
        },
        body: JSON.stringify({
          caller_full_name: "Caller",
          caller_id_number: "123456789",
          caller_phone: "050-0000000",
          request_for_self: true,
          category: "other",
          trip_type: "medical",
          source_address: "A",
          destination_address: "B",
          requested_arrival_at: "2026-05-24T10:00:00.000Z",
          return_trip_required: false,
        }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ride_request_id: "rr-1",
      passenger_id: "p-1",
      status: "pending",
    });
  });
});
