import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { POST } from "@/app/api/rides/route";
import { PATCH } from "@/app/api/rides/[id]/status/route";
import { GET as getDriverRides } from "@/app/api/driver/rides/route";
import { signDriverToken } from "@/lib/auth/local-auth";
import { createAuthenticatedRequest, getAuthenticatedSupabase, signInSeedUser } from "./helpers";

// Synthetic and Seeded IDs
const TEST_RIDE_REQUEST_ID = "99999999-9999-9999-9999-999999999999";
const REOPEN_TEST_RIDE_REQUEST_ID = "99999999-9999-9999-9999-999999999998";
const SEED_PASSENGER_ID = "55555555-0000-0000-0000-000000000001"; // Miriam Katz

const SEED_DRIVER_1 = "33333333-0000-0000-0000-000000000001"; // Avi Cohen
const SEED_DRIVER_USER_1 = "22222222-0000-0000-0000-000000000001";
const SEED_AMBULANCE_1 = "44444444-0000-0000-0000-000000000001";
const SEED_DRIVER_1_SERVICE_ZONE = "11111111-0000-0000-0000-000000000001";

const SEED_DRIVER_2 = "33333333-0000-0000-0000-000000000002"; // Noa Levi
const SEED_DRIVER_USER_2 = "22222222-0000-0000-0000-000000000002";
const SEED_AMBULANCE_2 = "44444444-0000-0000-0000-000000000002";
const REOPEN_TEST_AMBULANCE_1 = "44444444-1000-0000-0000-000000000001";
const REOPEN_TEST_AMBULANCE_2 = "44444444-1000-0000-0000-000000000002";

describe("Rides Race Condition Integration Tests", () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await signInSeedUser("admin.dispatch@savionim.test");
    await cleanUpTestRides();
  });

  async function cleanUpTestRides() {
    const supabase = getAuthenticatedSupabase(adminToken);
    await supabase.from("rides").delete().eq("ride_request_id", TEST_RIDE_REQUEST_ID);
    await supabase.from("ride_requests").delete().eq("id", TEST_RIDE_REQUEST_ID);
    await supabase.from("rides").delete().eq("ride_request_id", REOPEN_TEST_RIDE_REQUEST_ID);
    await supabase.from("ride_requests").delete().eq("id", REOPEN_TEST_RIDE_REQUEST_ID);
  }

  afterAll(async () => {
    await cleanUpTestRides();
  });

  it("handles concurrent ride assignments gracefully (exactly one succeeds, other gets 409)", async () => {
    const supabase = getAuthenticatedSupabase(adminToken);

    // 1. Insert isolated test ride request
    const { error: reqError } = await supabase.from("ride_requests").insert({
      id: TEST_RIDE_REQUEST_ID,
      passenger_id: SEED_PASSENGER_ID,
      service_zone_id: SEED_DRIVER_1_SERVICE_ZONE,
      status: "approved",
      source_address: "123 Integration Test St",
      destination_address: "456 Integration Test Rd",
    });

    if (reqError) {
      throw new Error(`Failed to insert test ride request: ${reqError.message}`);
    }

    // 2. Build the concurrent POST requests
    const driverToken1 = signDriverToken({
      sub: SEED_DRIVER_USER_1,
      driverId: SEED_DRIVER_1,
      email: "avi.cohen@savionim.test",
      role: "driver",
    }).token;
    const driverToken2 = signDriverToken({
      sub: SEED_DRIVER_USER_2,
      driverId: SEED_DRIVER_2,
      email: "noa.levi@savionim.test",
      role: "driver",
    }).token;

    const req1 = createAuthenticatedRequest("http://localhost/api/rides", driverToken1, {
      method: "POST",
      body: JSON.stringify({
        ride_request_id: TEST_RIDE_REQUEST_ID,
        ambulance_id: SEED_AMBULANCE_1,
      }),
    });

    const req2 = createAuthenticatedRequest("http://localhost/api/rides", driverToken2, {
      method: "POST",
      body: JSON.stringify({
        ride_request_id: TEST_RIDE_REQUEST_ID,
        ambulance_id: SEED_AMBULANCE_2,
      }),
    });

    // 3. Execute concurrently simulating a race condition
    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

    // 4. Assert exactly one succeeded with 201 and the other failed with 409
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    // 5. Assert the error message on the conflicting request
    const failedRes = res1.status === 409 ? res1 : res2;
    const body = await failedRes.json();
    expect([
      "Ride request already has an active assignment",
      "Ride request is no longer open for assignment",
    ]).toContain(body.error);

    // 6. Double check database state to make sure only one ride exists
    const { data: dbRides, error: fetchError } = await supabase
      .from("rides")
      .select("id")
      .eq("ride_request_id", TEST_RIDE_REQUEST_ID);

    expect(fetchError).toBeNull();
    expect(dbRides).toHaveLength(1);
  });

  it("reopens a rejected ride request and keeps the rejected ride out of history", async () => {
    const supabase = getAuthenticatedSupabase(adminToken);
    const { error: reqError } = await supabase.from("ride_requests").insert({
      id: REOPEN_TEST_RIDE_REQUEST_ID,
      passenger_id: SEED_PASSENGER_ID,
      service_zone_id: SEED_DRIVER_1_SERVICE_ZONE,
      status: "approved",
      source_address: "123 Reopen Test St",
      destination_address: "456 Reopen Test Rd",
    });

    if (reqError) {
      throw new Error(`Failed to insert reopen test ride request: ${reqError.message}`);
    }

    const driverToken1 = signDriverToken({
      sub: SEED_DRIVER_USER_1,
      driverId: SEED_DRIVER_1,
      email: "avi.cohen@savionim.test",
      role: "driver",
    }).token;
    const driverToken2 = signDriverToken({
      sub: SEED_DRIVER_USER_2,
      driverId: SEED_DRIVER_2,
      email: "noa.levi@savionim.test",
      role: "driver",
    }).token;

    const accepted = await POST(createAuthenticatedRequest(
      "http://localhost/api/rides",
      driverToken1,
      {
        method: "POST",
        body: JSON.stringify({
          ride_request_id: REOPEN_TEST_RIDE_REQUEST_ID,
          ambulance_id: REOPEN_TEST_AMBULANCE_1,
        }),
      },
    ));
    expect(accepted.status).toBe(201);
    const acceptedRide = await accepted.json();

    const rejected = await PATCH(
      createAuthenticatedRequest(
        `http://localhost/api/rides/${acceptedRide.id}/status`,
        driverToken1,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "rejected",
            rejection_reason: "Schedule conflict",
          }),
        },
      ),
      { params: Promise.resolve({ id: acceptedRide.id }) },
    );
    expect(rejected.status).toBe(200);

    const { data: reopenedRequest, error: reopenError } = await supabase
      .from("ride_requests")
      .select("status")
      .eq("id", REOPEN_TEST_RIDE_REQUEST_ID)
      .single();
    expect(reopenError).toBeNull();
    expect(reopenedRequest?.status).toBe("approved");

    const dashboard = await getDriverRides(createAuthenticatedRequest(
      "http://localhost/api/driver/rides",
      driverToken1,
    ));
    expect(dashboard.status).toBe(200);
    const dashboardBody = await dashboard.json();
    expect(dashboardBody.openRides.some(
      (ride: { id: string }) => ride.id === REOPEN_TEST_RIDE_REQUEST_ID,
    )).toBe(true);
    expect(dashboardBody.rideHistory.some(
      (ride: { id: string }) => ride.id === acceptedRide.id,
    )).toBe(false);

    const acceptedAgain = await POST(createAuthenticatedRequest(
      "http://localhost/api/rides",
      driverToken2,
      {
        method: "POST",
        body: JSON.stringify({
          ride_request_id: REOPEN_TEST_RIDE_REQUEST_ID,
          ambulance_id: REOPEN_TEST_AMBULANCE_2,
        }),
      },
    ));
    expect(acceptedAgain.status).toBe(201);
  });
});
