"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) return { error: "Not authenticated" as const };

  const client = createSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return { error: "Invalid session" as const };

  const result = await query<{ role: string }>(
    "SELECT role FROM public.users WHERE id = $1",
    [user.id],
  );
  if (result.rows[0]?.role !== "admin") return { error: "Forbidden" as const };

  return { ok: true as const, client };
}

export async function toggleUserActive(
  userId: string,
  active: boolean,
  pathToRevalidate: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth;

  await query(
    "UPDATE public.users SET is_active = $1 WHERE id = $2",
    [active, userId],
  );
  revalidatePath(pathToRevalidate);
  return { ok: true };
}

export async function deleteUser(
  userId: string,
  pathToRevalidate: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await verifyAdmin();
  if ("error" in auth) return auth;

  const { error } = await auth.client.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath(pathToRevalidate);
  return { ok: true };
}
