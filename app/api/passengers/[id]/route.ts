import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

const VALID_MOBILITY = ["none", "wheelchair", "walker", "cane"] as const;
type MobilityNeed = (typeof VALID_MOBILITY)[number];

const PASSENGER_FIELDS =
  "id, national_id, full_name, category, mobility_need, mobility_notes, phone, emergency_contact";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("passengers")
    .select(PASSENGER_FIELDS)
    .eq("id", id)
    .single()

  if (error) return supabaseErrorResponse(error);

  return Response.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    national_id,
    full_name,
    category,
    mobility_need,
    mobility_notes,
    phone,
    emergency_contact,
  } = body;

  if (mobility_need !== undefined && !VALID_MOBILITY.includes(mobility_need as MobilityNeed)) {
    return Response.json(
      { error: `Invalid mobility_need. Must be one of: ${VALID_MOBILITY.join(", ")}` },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (national_id !== undefined) patch.national_id = national_id;
  if (full_name !== undefined) patch.full_name = full_name;
  if (category !== undefined) patch.category = category;
  if (mobility_need !== undefined) patch.mobility_need = mobility_need;
  if (mobility_notes !== undefined) patch.mobility_notes = mobility_notes;
  if (phone !== undefined) patch.phone = phone;
  if (emergency_contact !== undefined) patch.emergency_contact = emergency_contact;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("passengers")
    .update(patch)
    .eq("id", id)
    .select(PASSENGER_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "national_id already exists" }, { status: 409 });
    }
    return supabaseErrorResponse(error);
  }

  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("passengers").delete().eq("id", id);

  if (error) return supabaseErrorResponse(error);
  return new Response(null, { status: 204 });
}
