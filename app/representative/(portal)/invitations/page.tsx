import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { InviteForm } from "./InviteForm";
import type { InvitationRow } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  accepted: "התקבל",
  expired: "פג תוקף",
  revoked: "בוטל",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  accepted: "bg-green-50 text-green-700 border border-green-100",
  expired: "bg-gray-100 text-gray-500",
  revoked: "bg-red-50 text-red-700 border border-red-100",
};

const ROLE_LABEL: Record<string, string> = {
  representative: "נציג",
  driver: "נהג",
  admin: "מנהל",
};

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) return null;

  const adminClient = createSupabaseClient();
  const {
    data: { user },
  } = await adminClient.auth.getUser(token);
  if (!user) return null;

  const result = await query<{ role: string; full_name: string; can_approve_drivers: boolean }>(
    `SELECT role, full_name, can_approve_drivers FROM public.users WHERE id = $1`,
    [user.id],
  );

  return result.rows[0] ?? null;
}

async function getInvitations(userId: string): Promise<InvitationRow[]> {
  const result = await query<InvitationRow>(
    `SELECT id, email, invited_role, status, created_at
     FROM public.invitations
     WHERE invited_by = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId],
  );
  return result.rows;
}

export default async function InvitationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col gap-6" dir="rtl">
        <h1 className="text-xl font-semibold text-gray-900">הזמנות</h1>
        <p className="text-sm text-red-600">אין הרשאה לצפייה בדף זה.</p>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const canSendInvites = isAdmin || (currentUser.role === "representative" && currentUser.can_approve_drivers);

  if (!canSendInvites) {
    return (
      <div className="flex flex-col gap-6" dir="rtl">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">הזמנות</h1>
          <p className="mt-1 text-sm text-gray-400">הזמנת נהגים למערכת</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500">אין לך הרשאה לשלוח הזמנות.</p>
          <p className="mt-1 text-xs text-gray-400">פנה למנהל המערכת לקבלת גישה.</p>
        </div>
      </div>
    );
  }

  const adminClient = createSupabaseClient();
  const { data: { user } } = await adminClient.auth.getUser(token!);
  const invitations = user ? await getInvitations(user.id) : [];

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">הזמנות</h1>
        <p className="mt-1 text-sm text-gray-400">
          {isAdmin ? "שלח הזמנות לנציגים ולנהגים" : "שלח הזמנות לנהגים חדשים"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <InviteForm canInviteRepresentative={isAdmin} />

        <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">הזמנות שנשלחו</h2>
          </div>

          {invitations.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-400">
              לא נשלחו הזמנות עדיין
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
                  <th className="px-4 py-3 font-medium">אימייל</th>
                  <th className="px-4 py-3 font-medium">תפקיד</th>
                  <th className="px-4 py-3 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-gray-700">{inv.email}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {ROLE_LABEL[inv.invited_role] ?? inv.invited_role}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
