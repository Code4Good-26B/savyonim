import { query } from "@/lib/db";

export const runtime = "nodejs";

type ServiceZoneRow = {
  id: string;
  name: string;
  region_code: string | null;
  is_active: boolean;
};

export async function GET() {
  const result = await query<ServiceZoneRow>(
    "select id, name, region_code, is_active from public.service_zones order by name",
  );

  return Response.json(result.rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, region_code, is_active = true } = body;

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const result = await query<ServiceZoneRow>(
      `
        insert into public.service_zones (name, region_code, is_active)
        values ($1, $2, $3)
        returning id, name, region_code, is_active
      `,
      [name, region_code ?? null, is_active],
    );

    return Response.json(result.rows[0], { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === "23505") {
      return Response.json({ error: "name or region_code already exists" }, { status: 409 });
    }
    return Response.json({ error: pgError.message ?? "Could not create service zone" }, { status: 500 });
  }
}
