import { createSupabaseClient } from "@/lib/supabase";

const VALID_MOBILITY = ["none", "wheelchair", "walker", "cane"] as const;
type MobilityNeed = (typeof VALID_MOBILITY)[number];

const PASSENGER_FIELDS =
  "id, national_id, full_name, category, mobility_need, mobility_notes, phone, emergency_contact";

export async function GET() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("passengers")
    .select(PASSENGER_FIELDS)
    .order("full_name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    national_id,
    full_name,
    category,
    mobility_need = "none",
    mobility_notes,
    phone,
    emergency_contact,
  } = body;

  if (!full_name) {
    return Response.json({ error: "full_name is required" }, { status: 400 });
  }

  if (!VALID_MOBILITY.includes(mobility_need as MobilityNeed)) {
    return Response.json(
      { error: `Invalid mobility_need. Must be one of: ${VALID_MOBILITY.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("passengers")
    .insert({ national_id, full_name, category, mobility_need, mobility_notes, phone, emergency_contact })
    .select(PASSENGER_FIELDS)
    .single();

  if (error) {
    // Postgres unique violation on national_id
    if (error.code === "23505") {
      return Response.json({ error: "national_id already exists" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
