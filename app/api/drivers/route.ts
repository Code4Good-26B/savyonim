import { createSupabaseClient } from "@/lib/supabase";

const DRIVER_FIELDS = "id, user_id, contact_phone, service_zone_id, is_active";

export async function GET() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("drivers")
    .select(DRIVER_FIELDS)
    .order("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, contact_phone, service_zone_id } = body;

  if (!user_id) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("drivers")
    .insert({ user_id, contact_phone, service_zone_id })
    .select(DRIVER_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "user_id already has a driver profile" }, { status: 409 });
    }
    if (error.code === "23503") {
      return Response.json({ error: "user_id or service_zone_id does not exist" }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
