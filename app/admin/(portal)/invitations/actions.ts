"use server";

import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

type InvitableRole = "representative" | "driver";

export async function sendAdminInvite(
  email: string,
  role: InvitableRole,
): Promise<{ ok: true } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) return { error: "Not authenticated" };

  const adminClient = createSupabaseClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return { error: "Invalid session" };

  const result = await query<{ role: string; is_active: boolean }>(
    `SELECT role, is_active FROM public.users WHERE id = $1`,
    [user.id],
  );

  const dbUser = result.rows[0];
  if (!dbUser?.is_active || dbUser.role !== "admin") {
    return { error: "Insufficient permissions" };
  }

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { app_role: role, invited_role: role, role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/onboarding`,
  });

  if (inviteError) return { error: inviteError.message };

  try {
    await query(
      `INSERT INTO public.invitations (email, invited_role, invited_by)
       VALUES ($1, $2::public.user_role, $3)`,
      [email.toLowerCase(), role, user.id],
    );
  } catch { /* recorded best-effort */ }

  return { ok: true };
}

export type InvitationRow = {
  id: string;
  email: string;
  invited_role: string;
  status: string;
  created_at: string;
};

export async function revokeInvitation(
  invitationId: string,
): Promise<{ ok: true } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) return { error: "Not authenticated" };

  const adminClient = createSupabaseClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return { error: "Invalid session" };

  const updated = await query<{ auth_user_id: string | null }>(
    `UPDATE public.invitations SET status = 'revoked', updated_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING auth_user_id`,
    [invitationId],
  );

  if (updated.rows.length === 0) return { error: "הזמנה לא נמצאה" };

  const authUserId = updated.rows[0].auth_user_id;
  if (authUserId) {
    try { await adminClient.auth.admin.deleteUser(authUserId); } catch { /* best-effort */ }
  }

  return { ok: true };
}

export async function resendInvitation(
  invitationId: string,
): Promise<{ ok: true } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) return { error: "Not authenticated" };

  const adminClient = createSupabaseClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return { error: "Invalid session" };

  const invResult = await query<{ email: string; invited_role: string }>(
    `SELECT email, invited_role FROM public.invitations WHERE id = $1 AND status = 'pending'`,
    [invitationId],
  );

  const inv = invResult.rows[0];
  if (!inv) return { error: "הזמנה לא נמצאה" };

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(inv.email, {
    data: { app_role: inv.invited_role, invited_role: inv.invited_role, role: inv.invited_role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/onboarding`,
  });

  if (inviteError) return { error: inviteError.message };

  return { ok: true };
}
