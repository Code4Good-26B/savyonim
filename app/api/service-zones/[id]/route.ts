import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("service_zones")
    .select("id, name, region_code, is_active")
    .eq("id", id)
    .single();

  if (error) return supabaseErrorResponse(error, 404);
  return Response.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, region_code, is_active } = body;

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (region_code !== undefined) patch.region_code = region_code;
  if (is_active !== undefined) patch.is_active = is_active;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("service_zones")
    .update(patch)
    .eq("id", id)
    .select("id, name, region_code, is_active")
    .single();

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("service_zones")
    .delete()
    .eq("id", id);

  if (error) return supabaseErrorResponse(error);
  return new Response(null, { status: 204 });
}
