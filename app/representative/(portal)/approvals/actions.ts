"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

async function getCallerWithPermission() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) return { error: "Not authenticated" as const };

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) return { error: "Invalid session" as const };

  const result = await query<{ role: string; can_approve_drivers: boolean }>(
    "SELECT role, can_approve_drivers FROM public.users WHERE id = $1",
    [user.id],
  );
  const dbUser = result.rows[0];

  const isAdmin = dbUser?.role === "admin";
  const isApprover = dbUser?.role === "representative" && dbUser.can_approve_drivers;
  if (!isAdmin && !isApprover) return { error: "Insufficient permissions" as const };

  return { ok: true as const };
}

export async function approveDriver(
  driverUserId: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await getCallerWithPermission();
  if ("error" in auth) return auth;

  await query(
    "UPDATE public.users SET status = 'approved', is_active = true WHERE id = $1 AND role = 'driver'",
    [driverUserId],
  );
  revalidatePath("/representative/approvals");
  return { ok: true };
}

export async function rejectDriver(
  driverUserId: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await getCallerWithPermission();
  if ("error" in auth) return auth;

  await query(
    "UPDATE public.users SET status = 'rejected', is_active = false WHERE id = $1 AND role = 'driver'",
    [driverUserId],
  );
  revalidatePath("/representative/approvals");
  return { ok: true };
}
