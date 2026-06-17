import { createHmac } from "crypto";

// Ensure this matches the seed users from your local DB
const TEST_RIDE_REQUEST_ID = "55555555-5555-5555-5555-555555555555";
const AMBULANCE_BASE_ID = "44444444-0000-0000-0000-0000000000";

// Mock Driver Tokens Generator
function createDriverToken(driverIndex) {
  const jwtSecret = process.env.JWT_SECRET || "super-secret-jwt-key-for-local-dev-only";
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "supabase",
    aud: "authenticated",
    role: "driver",
    sub: `22222222-0000-0000-0000-0000000000${String(driverIndex).padStart(2, '0')}`,
    driverId: `33333333-0000-0000-0000-0000000000${String(driverIndex).padStart(2, '0')}`,
    email: `driver${driverIndex}@savionim.test`,
    iat: now,
    exp: now + 60 * 60,
  };

  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function runLoadTest() {
  console.log("🚀 Starting Savyonim Load Test: 50 concurrent drivers trying to accept the same ride.");
  
  // Wait, without an actual database entry for TEST_RIDE_REQUEST_ID, this will fail with 404/400.
  // In a real scenario, you'd insert the ride request first. 
  // We'll hit the localhost endpoint
  
  const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
  const CONCURRENT_REQUESTS = 50;

  const requests = [];

  for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
    const token = createDriverToken(i);
    const ambulanceId = `${AMBULANCE_BASE_ID}${String(i).padStart(2, '0')}`;

    requests.push(
      fetch(`${BASE_URL}/api/rides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ride_request_id: TEST_RIDE_REQUEST_ID,
          ambulance_id: ambulanceId
        })
      })
    );
  }

  const startTime = Date.now();
  const responses = await Promise.allSettled(requests);
  const endTime = Date.now();

  let successCount = 0;
  let conflictCount = 0;
  let otherErrors = 0;

  for (const res of responses) {
    if (res.status === "fulfilled") {
      if (res.value.status === 201) successCount++;
      else if (res.value.status === 409) conflictCount++;
      else otherErrors++;
    } else {
      otherErrors++;
    }
  }

  console.log("✅ Load Test Complete");
  console.log(`⏱️  Duration: ${endTime - startTime}ms`);
  console.log(`🟢 Successful Assignments (Should be 1): ${successCount}`);
  console.log(`🟠 Conflicts (Race Condition Prevented): ${conflictCount}`);
  console.log(`🔴 Other Errors: ${otherErrors}`);

  if (successCount === 1) {
    console.log("🎉 SUCCESS: Race condition successfully mitigated!");
  } else if (successCount > 1) {
    console.error("❌ FAILED: Multiple drivers assigned to the same ride!");
  } else {
    console.warn("⚠️ Warning: No successful assignments. (Is the server running and test ride inserted?)");
  }
}

runLoadTest();
