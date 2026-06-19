import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

type Row = {
  full_name: string;
  email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  ride_status: string | null;
};

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const result = await query<Row>(`
    SELECT u.full_name, u.email, d.contact_phone, u.is_active,
      r.status AS ride_status
    FROM public.drivers d
    JOIN public.users u ON u.id = d.user_id
    LEFT JOIN public.rides r ON r.driver_id = d.id AND r.status IN ('assigned', 'in_progress')
    ORDER BY u.full_name
  `);

  const headers = ["שם מלא", "אימייל", "טלפון", "פעיל", "סטטוס נסיעה"];
  const rows = result.rows.map((d) => [
    d.full_name,
    d.email ?? "",
    d.contact_phone ?? "",
    d.is_active ? "כן" : "לא",
    d.ride_status ?? "פנוי",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="drivers-${Date.now()}.csv"`,
    },
  });
}
