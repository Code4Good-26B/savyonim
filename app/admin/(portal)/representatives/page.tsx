import { query } from "@/lib/db";
import { RepToggle } from "./RepToggle";

type RepRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  can_approve_drivers: boolean;
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
      u.can_approve_drivers,
      u.created_at,
      (SELECT count(*) FROM public.invitations i WHERE i.invited_by = u.id)::text AS invitations_sent
    FROM public.users u
    WHERE u.role = 'representative'
    ORDER BY u.is_active DESC, u.full_name
  `);

  const reps = result.rows;
  const active = reps.filter((r) => r.is_active).length;
  const inactive = reps.length - active;
  const canApprove = reps.filter((r) => r.can_approve_drivers).length;

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2>נציגים</h2>
        <p className="mt-1 text-sm text-muted-foreground">כלל הנציגים הרשומים במערכת</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "סה״כ נציגים", value: reps.length,
            icon: <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
          },
          {
            label: "פעילים", value: active,
            icon: <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          },
          {
            label: "לא פעילים", value: inactive,
            icon: <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          },
          {
            label: "מורשים לאשר נהגים", value: canApprove,
            icon: <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              {s.icon}
            </div>
            <p className="text-3xl font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">שם</th>
              <th className="px-6 py-3 font-medium">אימייל</th>
              <th className="px-6 py-3 font-medium">הזמנות</th>
              <th className="px-6 py-3 font-medium">נרשם</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
              <th className="px-6 py-3 font-medium">אישור נהגים</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                  אין נציגים רשומים
                </td>
              </tr>
            ) : (
              reps.map((r) => (
                <tr key={r.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{r.full_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{r.email ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground tabular-nums">{r.invitations_sent}</td>
                  <td className="px-6 py-4 text-muted-foreground tabular-nums">
                    {new Date(r.created_at).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? "פעיל" : "לא פעיל"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <RepToggle userId={r.id} value={r.can_approve_drivers} />
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
