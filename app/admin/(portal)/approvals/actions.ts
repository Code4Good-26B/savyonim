"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { sendEmail, approvalEmailHtml, rejectionEmailHtml } from "@/lib/email";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) return { error: "Not authenticated" as const };

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) return { error: "Invalid session" as const };

  const result = await query<{ role: string }>(
    "SELECT role FROM public.users WHERE id = $1",
    [user.id],
  );
  if (result.rows[0]?.role !== "admin") return { error: "Insufficient permissions" as const };

  return { ok: true as const };
}

export async function approveUser(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth;

  const userResult = await query<{ full_name: string; email: string | null }>(
    "UPDATE public.users SET status = 'approved', is_active = true WHERE id = $1 RETURNING full_name, email",
    [userId],
  );
  revalidatePath("/admin/approvals");

  const u = userResult.rows[0];
  if (u?.email) {
    await sendEmail({ to: u.email, subject: "בקשתך אושרה — סביונים", html: approvalEmailHtml(u.full_name) });
  }
  return { ok: true };
}

export async function rejectUser(
  userId: string,
  reason?: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth;

  const userResult = await query<{ full_name: string; email: string | null }>(
    "UPDATE public.users SET status = 'rejected', is_active = false WHERE id = $1 RETURNING full_name, email",
    [userId],
  );
  revalidatePath("/admin/approvals");

  const u = userResult.rows[0];
  if (u?.email) {
    await sendEmail({ to: u.email, subject: "עדכון על בקשתך — סביונים", html: rejectionEmailHtml(u.full_name, reason) });
  }
  return { ok: true };
}
