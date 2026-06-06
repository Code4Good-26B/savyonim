import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

const SERVICE_ZONE_FIELDS = "id, name, region_code, is_active";

export async function GET(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("service_zones")
    .select(SERVICE_ZONE_FIELDS)
    .order("name");

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json();
  const { name, region_code, is_active = true } = body;

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("service_zones")
    .insert({ name, region_code, is_active })
    .select(SERVICE_ZONE_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "name or region_code already exists" }, { status: 409 });
    }
    return supabaseErrorResponse(error);
  }

  return Response.json(data, { status: 201 });
}
