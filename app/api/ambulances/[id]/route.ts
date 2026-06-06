import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

const AMBULANCE_FIELDS = "id, license_plate, service_zone_id, is_available, is_active";

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
    .from("ambulances")
    .select(AMBULANCE_FIELDS)
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
  const { license_plate, service_zone_id, is_available, is_active } = body;

  const patch: Record<string, unknown> = {};
  if (license_plate !== undefined) patch.license_plate = license_plate;
  if (service_zone_id !== undefined) patch.service_zone_id = service_zone_id;
  if (is_available !== undefined) patch.is_available = is_available;
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
    .from("ambulances")
    .update(patch)
    .eq("id", id)
    .select(AMBULANCE_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "license_plate already exists" }, { status: 409 });
    }
    return supabaseErrorResponse(error);
  }

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
  const { error } = await supabase.from("ambulances").delete().eq("id", id);

  if (error) return supabaseErrorResponse(error);
  return new Response(null, { status: 204 });
}
