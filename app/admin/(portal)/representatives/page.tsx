import { query } from "@/lib/db";
import { RepToggle } from "./RepToggle";
import { DeleteUserButton } from "../DeleteUserButton";
import { DeactivateButton } from "../DeactivateButton";
import { AdminSearch } from "../AdminSearch";
import { AdminPagination } from "../AdminPagination";

const PAGE_SIZE = 10;

type RepRow = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  can_approve_drivers: boolean;
  created_at: string;
  invitations_sent: string;
  total?: string;
};

export default async function AdminRepresentativesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const offset = (page - 1) * PAGE_SIZE;

  const baseQuery = `
    FROM public.users u
    WHERE u.role = 'representative'
    ${q ? `AND (u.full_name ILIKE $1 OR u.email ILIKE $1)` : ""}
  `;

  const [allResult, pageResult] = await Promise.all([
    query<RepRow>(`
      SELECT u.id, u.full_name, u.email, u.is_active, u.can_approve_drivers, u.created_at,
        (SELECT count(*) FROM public.invitations i WHERE i.invited_by = u.id)::text AS invitations_sent
      ${baseQuery}
      ORDER BY u.is_active DESC, u.full_name
    `, q ? [`%${q}%`] : []),
    query<RepRow>(`
      SELECT u.id, u.full_name, u.email, u.is_active, u.can_approve_drivers, u.created_at,
        (SELECT count(*) FROM public.invitations i WHERE i.invited_by = u.id)::text AS invitations_sent,
        count(*) OVER() AS total
      ${baseQuery}
      ORDER BY u.is_active DESC, u.full_name
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `, q ? [`%${q}%`] : []),
  ]);

  const reps = pageResult.rows;
  const total = parseInt(pageResult.rows[0]?.total ?? "0", 10);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const all = allResult.rows;

  const active = all.filter((r) => r.is_active).length;
  const inactive = all.length - active;
  const canApprove = all.filter((r) => r.can_approve_drivers).length;

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2>נציגים</h2>
        <p className="mt-1 text-sm text-muted-foreground">כלל הנציגים הרשומים במערכת</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "סה״כ נציגים", value: all.length,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {q ? `תוצאות עבור "${q}" (${total})` : `סה״כ ${total} נציגים`}
            </span>
            <a
              href="/api/admin/export/representatives"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ייצוא CSV
            </a>
          </div>
          <AdminSearch placeholder="חפש לפי שם או אימייל..." />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">שם</th>
              <th className="px-6 py-3 font-medium">אימייל</th>
              <th className="px-6 py-3 font-medium">הזמנות</th>
              <th className="px-6 py-3 font-medium">נרשם</th>
              <th className="px-6 py-3 font-medium">אישור נהגים</th>
              <th className="px-6 py-3 font-medium">פעיל</th>
              <th className="px-6 py-3 font-medium"><span className="sr-only">פעולות</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reps.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-sm text-muted-foreground">
                  אין נציגים רשומים
                </td>
              </tr>
            ) : (
              reps.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-foreground">{r.full_name}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{r.email ?? "—"}</td>
                  <td className="px-6 py-3.5 text-muted-foreground tabular-nums">{r.invitations_sent}</td>
                  <td className="px-6 py-3.5 text-muted-foreground tabular-nums">
                    {new Date(r.created_at).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-6 py-3.5">
                    <RepToggle userId={r.id} value={r.can_approve_drivers} />
                  </td>
                  <td className="px-6 py-3.5">
                    <DeactivateButton userId={r.id} isActive={r.is_active} pathToRevalidate="/admin/representatives" />
                  </td>
                  <td className="px-4 py-3.5 text-left">
                    <DeleteUserButton userId={r.id} name={r.full_name} pathToRevalidate="/admin/representatives" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <AdminPagination page={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
