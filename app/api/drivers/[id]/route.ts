import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

const DRIVER_FIELDS = "id, user_id, contact_phone, service_zone_id, is_active";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("drivers")
    .select(DRIVER_FIELDS)
    .eq("id", id)
    .single();

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { contact_phone, service_zone_id, is_active } = body;

  const patch: Record<string, unknown> = {};
  if (contact_phone !== undefined) patch.contact_phone = contact_phone;
  if (service_zone_id !== undefined) patch.service_zone_id = service_zone_id;
  if (is_active !== undefined) patch.is_active = is_active;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("drivers")
    .update(patch)
    .eq("id", id)
    .select(DRIVER_FIELDS)
    .single();

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { error } = await supabase.from("drivers").delete().eq("id", id);

  if (error) return supabaseErrorResponse(error);
  return new Response(null, { status: 204 });
}
