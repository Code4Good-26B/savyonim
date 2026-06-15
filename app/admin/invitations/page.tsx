import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { AdminInviteForm } from "./InviteForm";
import type { InvitationRow } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  driver: "נהג",
  representative: "נציג",
  admin: "מנהל",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-100 text-yellow-800" },
  accepted: { label: "הצטרף", className: "bg-green-100 text-green-700" },
  expired: { label: "פג תוקף", className: "bg-gray-100 text-gray-500" },
};

export default async function AdminInvitationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) redirect("/admin/login");

  const adminClient = createSupabaseClient();
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);
  if (error || !user) redirect("/admin/login");

  const invitationsResult = await query<
    InvitationRow & { invited_by_name: string | null }
  >(
    `SELECT
       i.id, i.email, i.invited_role, i.status, i.created_at,
       u.full_name AS invited_by_name
     FROM public.invitations i
     LEFT JOIN public.users u ON u.id = i.invited_by
     ORDER BY i.created_at DESC
     LIMIT 100`,
  );

  const invitations = invitationsResult.rows;
  const counts = {
    total: invitations.length,
    pending: invitations.filter((i) => i.status === "pending").length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">הזמנות</h1>
        <p className="mt-1 text-sm text-gray-500">הזמנת נציגים ונהגים למערכת</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "סה״כ הזמנות", value: counts.total, accent: "border-t-blue-500", text: "text-blue-600" },
          { label: "ממתינות", value: counts.pending, accent: "border-t-yellow-400", text: "text-yellow-600" },
          { label: "התקבלו", value: counts.accepted, accent: "border-t-green-500", text: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-gray-200 bg-white p-5 border-t-4 ${s.accent}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`mt-3 text-4xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[340px_1fr] gap-6 items-start">
        <AdminInviteForm />

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">היסטוריית הזמנות</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3.5">אימייל</th>
                <th className="px-6 py-3.5">תפקיד</th>
                <th className="px-6 py-3.5">הוזמן ע״י</th>
                <th className="px-6 py-3.5">תאריך</th>
                <th className="px-6 py-3.5">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                    אין הזמנות עדיין
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const status = STATUS_CONFIG[inv.status] ?? { label: inv.status, className: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900">{inv.email}</td>
                      <td className="px-6 py-4 text-gray-500">{ROLE_LABEL[inv.invited_role] ?? inv.invited_role}</td>
                      <td className="px-6 py-4 text-gray-500">{inv.invited_by_name ?? "—"}</td>
                      <td className="px-6 py-4 text-gray-500 tabular-nums">
                        {new Date(inv.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
