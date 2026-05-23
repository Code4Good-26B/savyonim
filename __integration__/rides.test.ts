import { describe, it, expect, afterAll } from "vitest";
import { POST } from "@/app/api/rides/route";
import { createSupabaseClient } from "@/lib/supabase";

// Synthetic and Seeded IDs
const TEST_RIDE_REQUEST_ID = "99999999-9999-9999-9999-999999999999";
const SEED_PASSENGER_ID = "55555555-0000-0000-0000-000000000001"; // Miriam Katz

const SEED_DRIVER_1 = "33333333-0000-0000-0000-000000000001"; // Avi Cohen
const SEED_AMBULANCE_1 = "44444444-0000-0000-0000-000000000001";

const SEED_DRIVER_2 = "33333333-0000-0000-0000-000000000002"; // Noa Levi
const SEED_AMBULANCE_2 = "44444444-0000-0000-0000-000000000002";

const SEED_DISPATCHER_USER = "22222222-0000-0000-0000-000000000003"; // Yossi Mizrahi

describe("Rides Race Condition Integration Tests", () => {
  afterAll(async () => {
    const supabase = createSupabaseClient();
    // Clean up created rides and ride requests to prevent database pollution
    await supabase.from("rides").delete().eq("ride_request_id", TEST_RIDE_REQUEST_ID);
    await supabase.from("ride_requests").delete().eq("id", TEST_RIDE_REQUEST_ID);
  });

  it("handles concurrent ride assignments gracefully (exactly one succeeds, other gets 409)", async () => {
    const supabase = createSupabaseClient();

    // 1. Insert isolated test ride request
    const { error: reqError } = await supabase.from("ride_requests").insert({
      id: TEST_RIDE_REQUEST_ID,
      passenger_id: SEED_PASSENGER_ID,
      status: "pending",
      source_address: "123 Integration Test St",
      destination_address: "456 Integration Test Rd",
    });

    if (reqError) {
      throw new Error(`Failed to insert test ride request: ${reqError.message}`);
    }

    // 2. Build the concurrent POST requests
    const req1 = new Request("http://localhost/api/rides", {
      method: "POST",
      body: JSON.stringify({
        ride_request_id: TEST_RIDE_REQUEST_ID,
        driver_id: SEED_DRIVER_1,
        ambulance_id: SEED_AMBULANCE_1,
        assigned_by_user_id: SEED_DISPATCHER_USER,
      }),
    });

    const req2 = new Request("http://localhost/api/rides", {
      method: "POST",
      body: JSON.stringify({
        ride_request_id: TEST_RIDE_REQUEST_ID,
        driver_id: SEED_DRIVER_2,
        ambulance_id: SEED_AMBULANCE_2,
        assigned_by_user_id: SEED_DISPATCHER_USER,
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
    expect(body.error).toBe("Ride request already has an active assignment");

    // 6. Double check database state to make sure only one ride exists
    const { data: dbRides, error: fetchError } = await supabase
      .from("rides")
      .select("id")
      .eq("ride_request_id", TEST_RIDE_REQUEST_ID);

    expect(fetchError).toBeNull();
    expect(dbRides).toHaveLength(1);
  });
});
