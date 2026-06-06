import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

const AMBULANCE_FIELDS = "id, license_plate, service_zone_id, is_available, is_active";

export async function GET(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("ambulances")
    .select(AMBULANCE_FIELDS)
    .order("license_plate");

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { license_plate, service_zone_id, is_available = true } = body;

  if (!license_plate) {
    return Response.json({ error: "license_plate is required" }, { status: 400 });
  }

  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("ambulances")
    .insert({ license_plate, service_zone_id, is_available })
    .select(AMBULANCE_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "license_plate already exists" }, { status: 409 });
    }
    if (error.code === "23503") {
      return Response.json({ error: "service_zone_id does not exist" }, { status: 400 });
    }
    return supabaseErrorResponse(error);
  }

  return Response.json(data, { status: 201 });
}
