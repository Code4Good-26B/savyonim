"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

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
  if (result.rows[0]?.role !== "admin") return { error: "Forbidden" as const };

  return { ok: true as const };
}

export async function setCanApproveDrives(
  userId: string,
  value: boolean,
): Promise<{ ok: true } | { error: string }> {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth;

  await query(
    "UPDATE public.users SET can_approve_drivers = $1 WHERE id = $2 AND role = 'representative'",
    [value, userId],
  );
  revalidatePath("/admin/representatives");
  return { ok: true };
}
