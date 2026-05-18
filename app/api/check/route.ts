import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const result = await query<{ id: string }>(
    "select id from public.service_zones order by name limit 1",
  );

  return Response.json({
    status: "Local Docker database connection is successful!",
    results: result.rows,
  });
}
