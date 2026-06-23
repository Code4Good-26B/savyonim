import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

type Row = {
  full_name: string;
  email: string | null;
  is_active: boolean;
  can_approve_drivers: boolean;
  created_at: string;
  invitations_sent: string;
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
    SELECT u.full_name, u.email, u.is_active, u.can_approve_drivers, u.created_at,
      (SELECT count(*) FROM public.invitations i WHERE i.invited_by = u.id)::text AS invitations_sent
    FROM public.users u
    WHERE u.role = 'representative'
    ORDER BY u.full_name
  `);

  const headers = ["שם מלא", "אימייל", "פעיל", "מורשה לאשר נהגים", "תאריך הצטרפות", "הזמנות שנשלחו"];
  const rows = result.rows.map((r) => [
    r.full_name,
    r.email ?? "",
    r.is_active ? "כן" : "לא",
    r.can_approve_drivers ? "כן" : "לא",
    new Date(r.created_at).toLocaleDateString("he-IL"),
    r.invitations_sent,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="representatives-${Date.now()}.csv"`,
    },
  });
}
