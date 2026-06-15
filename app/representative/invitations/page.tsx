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
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  revoked: "bg-red-100 text-red-700",
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

  const result = await query<{ role: string; full_name: string }>(
    `SELECT role, full_name FROM public.users WHERE id = $1`,
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
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-gray-900">הזמנות</h1>
        <p className="text-sm text-red-600">אין הרשאה לצפייה בדף זה.</p>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const canSendInvites = isAdmin || currentUser.role === "representative";

  if (!canSendInvites) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-gray-900">הזמנות</h1>
        <p className="text-sm text-red-600">אין לך הרשאה לשלוח הזמנות.</p>
      </div>
    );
  }

  const adminClient = createSupabaseClient();
  const { data: { user } } = await adminClient.auth.getUser(token!);
  const invitations = user ? await getInvitations(user.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">הזמנות</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin ? "שלח הזמנות לנציגים ונהגים" : "שלח הזמנות לנהגים חדשים"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <InviteForm canInviteRepresentative={isAdmin} />

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">הזמנות שנשלחו</h2>
          </div>

          {invitations.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-400">
              לא נשלחו הזמנות עדיין
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">אימייל</th>
                  <th className="px-4 py-3">תפקיד</th>
                  <th className="px-4 py-3">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{inv.email}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {ROLE_LABEL[inv.invited_role] ?? inv.invited_role}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status] ?? "bg-gray-100 text-gray-600"}`}
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
