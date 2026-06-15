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
  in_progress: { label: "בנסיעה", className: "bg-cyan-100 text-cyan-800" },
  assigned: { label: "ממתין לאיסוף", className: "bg-yellow-100 text-yellow-800" },
  available: { label: "פנוי", className: "bg-green-100 text-green-700" },
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
    { label: "סה״כ נהגים", value: counts.total, accent: "border-t-blue-500", text: "text-blue-600" },
    { label: "פעילים", value: counts.active, accent: "border-t-green-500", text: "text-green-600" },
    { label: "בנסיעה / ממתין", value: counts.busy, accent: "border-t-amber-400", text: "text-amber-600" },
    { label: "פנויים", value: counts.available, accent: "border-t-cyan-500", text: "text-cyan-600" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">סטטוס נהגים</h1>
        <p className="mt-1 text-sm text-gray-500">מצב כלל הנהגים הרשומים במערכת</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s) => (
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
              <th className="px-6 py-3.5">שם נהג</th>
              <th className="px-6 py-3.5">טלפון</th>
              <th className="px-6 py-3.5">אימייל</th>
              <th className="px-6 py-3.5">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drivers.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-400">אין נהגים רשומים</td></tr>
            ) : (
              drivers.map((d) => {
                const status = getStatus(d);
                return (
                  <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.full_name}</td>
                    <td className="px-6 py-4 text-gray-500 tabular-nums">{d.contact_phone ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{d.email ?? "—"}</td>
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
  );
}
