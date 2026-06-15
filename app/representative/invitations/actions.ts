"use server";

import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

type InvitableRole = "representative" | "driver";

export async function sendInvite(
  email: string,
  role: InvitableRole,
): Promise<{ ok: true } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) return { error: "Not authenticated" };

  const adminClient = createSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);
  if (authError || !user) return { error: "Invalid session" };

  const result = await query<{ role: string; is_active: boolean }>(
    `SELECT role, is_active FROM public.users WHERE id = $1`,
    [user.id],
  );

  const dbUser = result.rows[0];
  if (!dbUser || !dbUser.is_active) return { error: "Account not active" };

  if (dbUser.role !== "admin" && dbUser.role !== "representative") {
    return { error: "Insufficient permissions" };
  }
  if (dbUser.role === "representative" && role !== "driver") {
    return { error: "Representatives can only invite drivers" };
  }

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/onboarding`,
  });

  if (inviteError) return { error: inviteError.message };

  try {
    await query(
      `INSERT INTO public.invitations (email, invited_role, invited_by)
       VALUES ($1, $2::public.user_role, $3)`,
      [email.toLowerCase(), role, user.id],
    );
  } catch {
    // invitation sent successfully even if recording failed
  }

  return { ok: true };
}

export type InvitationRow = {
  id: string;
  email: string;
  invited_role: string;
  status: string;
  created_at: string;
};

export async function getMyInvitations(): Promise<InvitationRow[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) return [];

  const adminClient = createSupabaseClient();
  const {
    data: { user },
  } = await adminClient.auth.getUser(token);
  if (!user) return [];

  const result = await query<InvitationRow>(
    `SELECT id, email, invited_role, status, created_at
     FROM public.invitations
     WHERE invited_by = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [user.id],
  );

  return result.rows;
}
