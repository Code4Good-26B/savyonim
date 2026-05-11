import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("service_zones")
    .select("id, name, region_code, is_active")
    .order("name");

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, region_code, is_active = true } = body;

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("service_zones")
    .insert({ name, region_code, is_active })
    .select("id, name, region_code, is_active")
    .single();

  if (error) return supabaseErrorResponse(error);
  return Response.json(data, { status: 201 });
}
