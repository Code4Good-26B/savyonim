import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";
import { acceptRide, rejectRide, updateRideOdometer, listMyRides } from "@/app/actions/ride-actions";

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

function mockDBMultiple(results: Array<{ data?: unknown; error?: { message: string; code?: string } | null }>) {
  const mockFrom = vi.fn();
  results.forEach((res) => {
    mockFrom.mockReturnValueOnce(chain(res));
  });

  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    from: mockFrom,
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

function mockAuthAndDB(
  authResult: { data: { user: unknown } | null; error: unknown },
  dbResult: { data?: unknown; error?: { message: string } | null }
) {
  vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue(authResult),
    },
    from: () => chain(dbResult),
  } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Server Actions: acceptRide", () => {
  const RIDE_REQUEST_ID = "11111111-1111-1111-1111-111111111111";
  const DRIVER_ID = "22222222-2222-2222-2222-222222222222";
  const AMBULANCE_ID = "33333333-3333-3333-3333-333333333333";

  it("returns success: false for invalid parameters", async () => {
    const res1 = await acceptRide("bad-uuid", DRIVER_ID, AMBULANCE_ID);
    expect(res1.success).toBe(false);
    expect(res1.message).toContain("Invalid rideRequestId format");

    const res2 = await acceptRide(RIDE_REQUEST_ID, "bad-uuid", AMBULANCE_ID);
    expect(res2.success).toBe(false);
    expect(res2.message).toContain("Invalid driverId format");

    const res3 = await acceptRide(RIDE_REQUEST_ID, DRIVER_ID, "bad-uuid");
    expect(res3.success).toBe(false);
    expect(res3.message).toContain("Invalid ambulanceId format");
  });

  it("creates a ride successfully", async () => {
    const mockRide = { id: "ride-id", ride_request_id: RIDE_REQUEST_ID, status: "assigned" };
    mockDB({ data: mockRide, error: null });

    const res = await acceptRide(RIDE_REQUEST_ID, DRIVER_ID, AMBULANCE_ID);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockRide);
  });

  it("handles race condition where ambulance already has active ride", async () => {
    mockDB({
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint "ux_rides_active_ambulance"',
        code: "23505",
      },
    });

    const res = await acceptRide(RIDE_REQUEST_ID, DRIVER_ID, AMBULANCE_ID);
    expect(res.success).toBe(false);
    expect(res.message).toBe("Ambulance already has an active ride");
  });

  it("handles race condition where ride request already has active assignment", async () => {
    mockDB({
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint "ux_rides_active_request"',
        code: "23505",
      },
    });

    const res = await acceptRide(RIDE_REQUEST_ID, DRIVER_ID, AMBULANCE_ID);
    expect(res.success).toBe(false);
    expect(res.message).toBe("Ride already taken by another driver");
  });
});

describe("Server Actions: rejectRide", () => {
  const RIDE_ID = "44444444-4444-4444-4444-444444444444";

  it("returns success: false for invalid parameters", async () => {
    const res1 = await rejectRide("bad-uuid", "No reason");
    expect(res1.success).toBe(false);
    expect(res1.message).toContain("Invalid rideId format");

    const res2 = await rejectRide(RIDE_ID, "   ");
    expect(res2.success).toBe(false);
    expect(res2.message).toContain("rejection_reason is required");
  });

  it("returns error if ride is not found", async () => {
    mockDB({ data: null, error: { message: "not found" } });

    const res = await rejectRide(RIDE_ID, "Driver rejected");
    expect(res.success).toBe(false);
    expect(res.message).toBe("Ride not found");
  });

  it("returns error for invalid transitions (e.g. from completed)", async () => {
    mockDB({ data: { status: "completed" }, error: null });

    const res = await rejectRide(RIDE_ID, "Rejecting completed ride");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Invalid transition: completed → rejected");
  });

  it("successfully rejects an assigned ride", async () => {
    const mockRejectedRide = { id: RIDE_ID, status: "rejected", rejection_reason: "Vehicle trouble" };
    mockDBMultiple([
      { data: { status: "assigned" }, error: null }, // fetch current
      { data: mockRejectedRide, error: null }, // update status
    ]);

    const res = await rejectRide(RIDE_ID, "Vehicle trouble");
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockRejectedRide);
  });
});

describe("Server Actions: updateRideOdometer", () => {
  const RIDE_ID = "44444444-4444-4444-4444-444444444444";

  it("returns error if no parameters provided", async () => {
    const res = await updateRideOdometer(RIDE_ID);
    expect(res.success).toBe(false);
    expect(res.message).toContain("No fields to update");
  });

  it("returns error for negative odometer values", async () => {
    const res1 = await updateRideOdometer(RIDE_ID, -10);
    expect(res1.success).toBe(false);
    expect(res1.message).toContain("odometer_start_km must be a positive number");

    const res2 = await updateRideOdometer(RIDE_ID, 100, -5);
    expect(res2.success).toBe(false);
    expect(res2.message).toContain("odometer_end_km must be a positive number");
  });

  it("returns error if endKm is less than startKm directly in input", async () => {
    const res = await updateRideOdometer(RIDE_ID, 120, 100);
    expect(res.success).toBe(false);
    expect(res.message).toContain("odometer_end_km must be greater than or equal to odometer_start_km");
  });

  it("returns error if endKm is less than pre-existing startKm in DB", async () => {
    mockDBMultiple([
      { data: { odometer_start_km: 150, odometer_end_km: null }, error: null }, // fetch current
    ]);

    const res = await updateRideOdometer(RIDE_ID, undefined, 140);
    expect(res.success).toBe(false);
    expect(res.message).toContain("odometer_end_km must be greater than or equal to odometer_start_km");
  });

  it("successfully updates odometer values", async () => {
    const mockUpdatedRide = { id: RIDE_ID, odometer_start_km: 150, odometer_end_km: 175 };
    mockDBMultiple([
      { data: { odometer_start_km: null, odometer_end_km: null }, error: null }, // fetch current
      { data: mockUpdatedRide, error: null }, // update
    ]);

    const res = await updateRideOdometer(RIDE_ID, 150, 175);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockUpdatedRide);
  });
});

describe("Server Actions: listMyRides", () => {
  it("returns unauthorized when user is not logged in", async () => {
    mockAuthAndDB({ data: { user: null }, error: { message: "Invalid session" } }, { data: null, error: null });

    const res = await listMyRides();
    expect(res.success).toBe(false);
    expect(res.message).toBe("Unauthorized");
  });

  it("returns database error on fetch failure", async () => {
    mockAuthAndDB(
      { data: { user: { id: "driver-user-123" } }, error: null },
      { data: null, error: { message: "DB query failed" } }
    );

    const res = await listMyRides();
    expect(res.success).toBe(false);
    expect(res.message).toBe("DB query failed");
  });

  it("returns a list of rides for the authenticated driver on success", async () => {
    const mockRides = [
      { id: "ride-1", driver_id: "driver-123", status: "assigned" },
      { id: "ride-2", driver_id: "driver-123", status: "in_progress" },
    ];
    mockAuthAndDB(
      { data: { user: { id: "driver-user-123" } }, error: null },
      { data: mockRides, error: null }
    );

    const res = await listMyRides();
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockRides);
  });
});
