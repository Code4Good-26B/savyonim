import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as POST_RIDE_REQUEST } from "@/app/api/ride-requests/route";
import { POST as POST_RIDE } from "@/app/api/rides/route";
import { PATCH as PATCH_RIDE_STATUS } from "@/app/api/rides/[id]/status/route";
import { createAuthenticatedRequest, getAuthenticatedSupabase, signInSeedUser } from "./helpers";
import { createClient } from "@supabase/supabase-js";

const SEED_PASSENGER_ID = "55555555-0000-0000-0000-000000000001"; // Miriam Katz
const SEED_DRIVER_1 = "33333333-0000-0000-0000-000000000001"; // Avi Cohen
const SEED_DRIVER_USER_1 = "22222222-0000-0000-0000-000000000001";
const SEED_AMBULANCE_1 = "44444444-0000-0000-0000-000000000001";
const SEED_SERVICE_ZONE = "11111111-0000-0000-0000-000000000001";

describe("Phase 5: Full E2E Ride Lifecycle Scenario", () => {
  let adminToken: string;
  let driverToken: string;
  let createdRideRequestId: string;
  let createdRideId: string;

  beforeAll(async () => {
    adminToken = await signInSeedUser("admin.dispatch@savionim.test");
    driverToken = await signInSeedUser("avi.cohen@savionim.test");
  });

  afterAll(async () => {
    // Cleanup the created ride and ride request
    if (adminToken) {
      const supabase = getAuthenticatedSupabase(adminToken);
      if (createdRideId) {
        await supabase.from("rides").delete().eq("id", createdRideId);
      }
      if (createdRideRequestId) {
        await supabase.from("rides").delete().eq("ride_request_id", createdRideRequestId); // just in case
        await supabase.from("ride_requests").delete().eq("id", createdRideRequestId);
      }
    }
  });

  it("Step 1: Dispatcher creates a ride request via API", async () => {
    const req = createAuthenticatedRequest("http://localhost/api/ride-requests", adminToken, {
      method: "POST",
      body: JSON.stringify({
        passenger_id: SEED_PASSENGER_ID,
        service_zone_id: SEED_SERVICE_ZONE,
        source_address: "123 E2E Test Source",
        destination_address: "456 E2E Test Dest",
        requested_pickup_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        requested_arrival_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        caller_full_name: "Dispatcher Test",
        caller_phone: "0500000000",
        request_for_self: false,
        trip_type: "medical",
        return_trip_required: false,
      }),
    });

    const res = await POST_RIDE_REQUEST(req);
    expect(res.status).toBe(201);
    
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body.status).toBe("pending"); // from ride-requests POST, default is pending
    createdRideRequestId = body.id;
  });

  it("Step 2: Driver accepts the ride using driver token", async () => {
    expect(createdRideRequestId).toBeDefined();

    // First we must approve the request because drivers can only accept 'approved' requests
    const adminSupabase = getAuthenticatedSupabase(adminToken);
    await adminSupabase.from("ride_requests").update({ status: "approved" }).eq("id", createdRideRequestId);

    const req = createAuthenticatedRequest("http://localhost/api/rides", driverToken, {
      method: "POST",
      body: JSON.stringify({
        ride_request_id: createdRideRequestId,
        ambulance_id: SEED_AMBULANCE_1,
      }),
    });

    const res = await POST_RIDE(req);
    expect(res.status).toBe(201);
    
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body.status).toBe("assigned");
    createdRideId = body.id;
  });

  it("Step 3: Driver completes the ride and submits odometer", async () => {
    expect(createdRideId).toBeDefined();

    const req = createAuthenticatedRequest(`http://localhost/api/rides/${createdRideId}/status`, driverToken, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        odometer_start_km: 1000,
        odometer_end_km: 1010,
      }),
    });

    const res = await PATCH_RIDE_STATUS(req, { params: Promise.resolve({ id: createdRideId }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(Number(body.odometer_start_km)).toBe(1000);
    expect(Number(body.odometer_end_km)).toBe(1010);
  });

  it("Step 4: Verify the database reflects the fully completed ride and linked request", async () => {
    const supabase = getAuthenticatedSupabase(adminToken);
    
    // Check ride
    const { data: ride } = await supabase.from("rides").select("*").eq("id", createdRideId).single();
    expect(ride.status).toBe("completed");
    
    // Check ride request
    const { data: request } = await supabase.from("ride_requests").select("*").eq("id", createdRideRequestId).single();
    expect(request.status).toBe("completed");
  });
});
