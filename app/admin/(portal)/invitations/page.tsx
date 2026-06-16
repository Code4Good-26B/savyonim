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
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">הזמנות</h1>
        <p className="mt-1 text-sm text-gray-400">הזמנת נציגים ונהגים למערכת</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "סה״כ הזמנות", value: counts.total,
            icon: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
          },
          {
            label: "ממתינות", value: counts.pending,
            icon: <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          },
          {
            label: "התקבלו", value: counts.accepted,
            icon: <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
              {s.icon}
            </div>
            <p className="text-3xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[340px_1fr] gap-6 items-start">
        <AdminInviteForm />

        <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">היסטוריית הזמנות</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
                <th className="px-6 py-3 font-medium">אימייל</th>
                <th className="px-6 py-3 font-medium">תפקיד</th>
                <th className="px-6 py-3 font-medium">הוזמן ע״י</th>
                <th className="px-6 py-3 font-medium">תאריך</th>
                <th className="px-6 py-3 font-medium">סטטוס</th>
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
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5 text-gray-900">{inv.email}</td>
                      <td className="px-6 py-3.5 text-gray-500">{ROLE_LABEL[inv.invited_role] ?? inv.invited_role}</td>
                      <td className="px-6 py-3.5 text-gray-500">{inv.invited_by_name ?? "—"}</td>
                      <td className="px-6 py-3.5 text-gray-500 tabular-nums">
                        {new Date(inv.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
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
