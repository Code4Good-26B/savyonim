import { query } from "@/lib/db";
import { DeleteUserButton } from "../DeleteUserButton";
import { DeactivateButton } from "../DeactivateButton";
import { AdminSearch } from "../AdminSearch";
import { AdminPagination } from "../AdminPagination";

const PAGE_SIZE = 10;

type DriverRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  ride_status: "assigned" | "in_progress" | null;
};

const STATUS_CONFIG = {
  in_progress: { label: "בנסיעה", className: "bg-cyan-50 text-cyan-700 border border-cyan-100" },
  assigned: { label: "ממתין לאיסוף", className: "bg-amber-50 text-amber-700 border border-amber-100" },
  available: { label: "פנוי", className: "bg-green-50 text-green-700 border border-green-100" },
  inactive: { label: "לא פעיל", className: "bg-muted text-muted-foreground" },
} as const;

function getStatus(row: DriverRow) {
  if (!row.is_active) return STATUS_CONFIG.inactive;
  if (row.ride_status === "in_progress") return STATUS_CONFIG.in_progress;
  if (row.ride_status === "assigned") return STATUS_CONFIG.assigned;
  return STATUS_CONFIG.available;
}

export default async function AdminDriversPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const offset = (page - 1) * PAGE_SIZE;

  const [allResult, pageResult] = await Promise.all([
    query<DriverRow>(`
      SELECT d.id, u.id AS user_id, u.full_name, u.email, d.contact_phone, u.is_active,
        r.status AS ride_status
      FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      LEFT JOIN public.rides r ON r.driver_id = d.id AND r.status IN ('assigned', 'in_progress')
      ${q ? `WHERE u.full_name ILIKE $1 OR u.email ILIKE $1 OR d.contact_phone ILIKE $1` : ""}
      ORDER BY CASE WHEN u.is_active THEN 0 ELSE 1 END, u.full_name
    `, q ? [`%${q}%`] : []),
    query<DriverRow & { total: string }>(`
      SELECT d.id, u.id AS user_id, u.full_name, u.email, d.contact_phone, u.is_active,
        r.status AS ride_status, count(*) OVER() AS total
      FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      LEFT JOIN public.rides r ON r.driver_id = d.id AND r.status IN ('assigned', 'in_progress')
      ${q ? `WHERE u.full_name ILIKE $1 OR u.email ILIKE $1 OR d.contact_phone ILIKE $1` : ""}
      ORDER BY CASE WHEN u.is_active THEN 0 ELSE 1 END, u.full_name
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `, q ? [`%${q}%`] : []),
  ]);

  const drivers = pageResult.rows;
  const total = parseInt(pageResult.rows[0]?.total ?? "0", 10);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const all = allResult.rows;

  const counts = {
    total: all.length,
    active: all.filter((d) => d.is_active).length,
    busy: all.filter((d) => d.ride_status !== null).length,
    available: all.filter((d) => d.is_active && d.ride_status === null).length,
  };

  const statCards = [
    { label: "סה״כ נהגים", value: counts.total, icon: <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: "פעילים", value: counts.active, icon: <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "בנסיעה / ממתין", value: counts.busy, icon: <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { label: "פנויים", value: counts.available, icon: <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2>נהגים</h2>
        <p className="mt-1 text-sm text-muted-foreground">מצב כלל הנהגים הרשומים במערכת</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
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
              {q ? `תוצאות עבור "${q}" (${total})` : `סה״כ ${total} נהגים`}
            </span>
            <a
              href="/api/admin/export/drivers"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ייצוא CSV
            </a>
          </div>
          <AdminSearch placeholder="חפש לפי שם, אימייל או טלפון..." />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">שם נהג</th>
              <th className="px-6 py-3 font-medium">טלפון</th>
              <th className="px-6 py-3 font-medium">אימייל</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
              <th className="px-6 py-3 font-medium">פעיל</th>
              <th className="px-6 py-3 font-medium"><span className="sr-only">פעולות</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {drivers.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">לא נמצאו נהגים</td></tr>
            ) : (
              drivers.map((d) => {
                const status = getStatus(d);
                return (
                  <tr key={d.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-foreground">{d.full_name}</td>
                    <td className="px-6 py-3.5 text-muted-foreground tabular-nums">{d.contact_phone ?? "—"}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{d.email ?? "—"}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <DeactivateButton userId={d.user_id} isActive={d.is_active} pathToRevalidate="/admin/drivers" />
                    </td>
                    <td className="px-4 py-3.5 text-left">
                      <DeleteUserButton userId={d.user_id} name={d.full_name} pathToRevalidate="/admin/drivers" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <AdminPagination page={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
