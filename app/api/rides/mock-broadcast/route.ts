import { createSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  // In Phase 2, this just logs and returns a success response
  // to act as a stub for broadcasting "new rides available"
  
  // Simulated Logic for matching mobility_need to ambulance_type
  // 1. Fetch pending requests
  const supabase = createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const { data: requests } = await supabase
    .from("ride_requests")
    .select("*, passenger:passenger_id(mobility_need)")
    .eq("status", "pending");

  if (requests && requests.length > 0) {
    for (const req of requests) {
      const mobilityNeed = req.passenger?.mobility_need || 'none';
      let requiredAmbulanceType = 'standard';
      
      if (mobilityNeed === 'wheelchair') {
        requiredAmbulanceType = 'wheelchair';
      } else if (mobilityNeed === 'lying_down') {
        requiredAmbulanceType = 'lying_down';
      }
      
      // We would normally fetch drivers in req.service_zone_id who have access to `requiredAmbulanceType`
      console.log(`[Mock Broadcast] Broadcasting request ${req.id} (need: ${mobilityNeed}) to drivers with ${requiredAmbulanceType} ambulance.`);
    }
  } else {
    console.log("[Mock Broadcast] No pending rides to broadcast");
  }

  return Response.json({ success: true, message: "Mock broadcast sent" });
}

export async function GET(request: Request) {
  return Response.json({ success: true, message: "Mock broadcast endpoint ready. Use POST to trigger." });
}
