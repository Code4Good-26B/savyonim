import { query } from "@/lib/db";

type RepRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  invitations_sent: string;
};

export default async function AdminRepresentativesPage() {
  const result = await query<RepRow>(`
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.is_active,
      u.created_at,
      (SELECT count(*) FROM public.invitations i WHERE i.invited_by = u.id)::text AS invitations_sent
    FROM public.users u
    WHERE u.role = 'representative'
    ORDER BY u.is_active DESC, u.full_name
  `);

  const reps = result.rows;
  const active = reps.filter((r) => r.is_active).length;
  const inactive = reps.length - active;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">סטטוס נציגים</h1>
        <p className="mt-1 text-sm text-gray-500">כלל הנציגים הרשומים במערכת</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "סה״כ נציגים", value: reps.length, accent: "border-t-blue-500", text: "text-blue-600" },
          { label: "פעילים", value: active, accent: "border-t-green-500", text: "text-green-600" },
          { label: "לא פעילים", value: inactive, accent: "border-t-gray-400", text: "text-gray-500" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-gray-200 bg-white p-5 border-t-4 ${s.accent}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`mt-3 text-4xl font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-6 py-3.5">שם</th>
              <th className="px-6 py-3.5">אימייל</th>
              <th className="px-6 py-3.5">הזמנות שנשלחו</th>
              <th className="px-6 py-3.5">נרשם</th>
              <th className="px-6 py-3.5">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reps.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">אין נציגים רשומים</td></tr>
            ) : (
              reps.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.full_name}</td>
                  <td className="px-6 py-4 text-gray-500">{r.email ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-500 tabular-nums">{r.invitations_sent}</td>
                  <td className="px-6 py-4 text-gray-500 tabular-nums">
                    {new Date(r.created_at).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.is_active ? "פעיל" : "לא פעיל"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
