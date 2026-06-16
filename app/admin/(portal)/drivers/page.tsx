import { query } from "@/lib/db";

type DriverRow = {
  id: string;
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
  inactive: { label: "לא פעיל", className: "bg-gray-100 text-gray-500" },
} as const;

function getStatus(row: DriverRow) {
  if (!row.is_active) return STATUS_CONFIG.inactive;
  if (row.ride_status === "in_progress") return STATUS_CONFIG.in_progress;
  if (row.ride_status === "assigned") return STATUS_CONFIG.assigned;
  return STATUS_CONFIG.available;
}

export default async function AdminDriversPage() {
  const result = await query<DriverRow>(`
    SELECT
      d.id, u.full_name, u.email, d.contact_phone, d.is_active,
      r.status AS ride_status
    FROM public.drivers d
    JOIN public.users u ON u.id = d.user_id
    LEFT JOIN public.rides r ON r.driver_id = d.id AND r.status IN ('assigned', 'in_progress')
    ORDER BY CASE WHEN d.is_active THEN 0 ELSE 1 END, u.full_name
  `);

  const drivers = result.rows;
  const counts = {
    total: drivers.length,
    active: drivers.filter((d) => d.is_active).length,
    busy: drivers.filter((d) => d.ride_status !== null).length,
    available: drivers.filter((d) => d.is_active && d.ride_status === null).length,
  };

  const statCards = [
    {
      label: "סה״כ נהגים", value: counts.total,
      icon: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "פעילים", value: counts.active,
      icon: <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "בנסיעה / ממתין", value: counts.busy,
      icon: <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
    {
      label: "פנויים", value: counts.available,
      icon: <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
  ];

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">נהגים</h1>
        <p className="mt-1 text-sm text-gray-400">מצב כלל הנהגים הרשומים במערכת</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
              {s.icon}
            </div>
            <p className="text-3xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
              <th className="px-6 py-3 font-medium">שם נהג</th>
              <th className="px-6 py-3 font-medium">טלפון</th>
              <th className="px-6 py-3 font-medium">אימייל</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drivers.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-400">אין נהגים רשומים</td></tr>
            ) : (
              drivers.map((d) => {
                const status = getStatus(d);
                return (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{d.full_name}</td>
                    <td className="px-6 py-3.5 text-gray-500 tabular-nums">{d.contact_phone ?? "—"}</td>
                    <td className="px-6 py-3.5 text-gray-500">{d.email ?? "—"}</td>
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
  );
}
