import { query } from "@/lib/db";
import { requireBearerAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

const VALID_MOBILITY = ["none", "walking", "wheelchair", "walker", "cane"] as const;
const VALID_CATEGORIES = [
  "wounded_soldier",
  "idf_disabled",
  "holocaust_survivor",
  "cancer_patient",
  "dialysis_patient",
  "other",
] as const;
type MobilityNeed = (typeof VALID_MOBILITY)[number];
type PassengerCategory = (typeof VALID_CATEGORIES)[number];

const PASSENGER_FIELDS =
  "id, national_id, full_name, category, mobility_need, mobility_notes, phone, emergency_contact";

type PassengerRow = {
  id: string;
  national_id: string | null;
  full_name: string;
  category: string | null;
  mobility_need: MobilityNeed;
  mobility_notes: string | null;
  phone: string | null;
  emergency_contact: string | null;
};

export async function GET(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    const result = await query<PassengerRow>(
      `select ${PASSENGER_FIELDS} from public.passengers order by full_name`,
    );
    return Response.json(result.rows);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

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

  if (category !== undefined && category !== null && !VALID_CATEGORIES.includes(category as PassengerCategory)) {
    return Response.json(
      { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const result = await query<PassengerRow>(
      `
        insert into public.passengers (
          national_id, full_name, category, mobility_need, mobility_notes, phone, emergency_contact
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning ${PASSENGER_FIELDS}
      `,
      [national_id, full_name, category, mobility_need, mobility_notes, phone, emergency_contact],
    );

    return Response.json(result.rows[0], { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === "23505") {
      return Response.json({ error: "national_id already exists" }, { status: 409 });
    }
    return Response.json({ error: pgError.message ?? "Could not create passenger" }, { status: 500 });
  }
}
