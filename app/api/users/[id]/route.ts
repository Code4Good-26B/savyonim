import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

const VALID_ROLES = ["admin", "representative", "driver"] as const;
type UserRole = (typeof VALID_ROLES)[number];

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
    .from("users")
    .select("id, full_name, phone, role, is_active")
    .eq("id", id)
    .single();

  if (error) return supabaseErrorResponse(error);

  return Response.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { full_name, phone, role, is_active } = body;

  if (role !== undefined && !VALID_ROLES.includes(role as UserRole)) {
    return Response.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (phone !== undefined) patch.phone = phone;
  if (role !== undefined) patch.role = role;
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
    .from("users")
    .update(patch)
    .eq("id", id)
    .select("id, full_name, phone, role, is_active")
    .single();

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}
