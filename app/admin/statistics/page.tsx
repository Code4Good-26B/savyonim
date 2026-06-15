import { query } from "@/lib/db";

type StatsRow = {
  total_requests: string;
  completed: string;
  pending: string;
  in_progress: string;
  rejected: string;
  active_drivers: string;
  total_drivers: string;
  active_reps: string;
  total_reps: string;
};

type MonthRow = { month: string; count: string };

export default async function StatisticsPage() {
  const [statsResult, monthlyResult] = await Promise.all([
    query<StatsRow>(`
      SELECT
        (SELECT count(*) FROM public.ride_requests
          WHERE created_at >= date_trunc('month', now()))::text AS total_requests,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'completed'
          AND created_at >= date_trunc('month', now()))::text AS completed,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'pending'
          AND created_at >= date_trunc('month', now()))::text AS pending,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'in_progress')::text AS in_progress,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'rejected'
          AND created_at >= date_trunc('month', now()))::text AS rejected,
        (SELECT count(*) FROM public.drivers WHERE is_active = true)::text AS active_drivers,
        (SELECT count(*) FROM public.drivers)::text AS total_drivers,
        (SELECT count(*) FROM public.users WHERE role = 'representative' AND is_active = true)::text AS active_reps,
        (SELECT count(*) FROM public.users WHERE role = 'representative')::text AS total_reps
    `),
    query<MonthRow>(`
      SELECT
        to_char(date_trunc('month', created_at), 'MM/YYYY') AS month,
        count(*)::text AS count
      FROM public.ride_requests
      WHERE created_at >= now() - interval '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) DESC
    `),
  ]);

  const s = statsResult.rows[0];
  const monthly = monthlyResult.rows;

  const completionRate =
    Number(s.total_requests) > 0
      ? Math.round((Number(s.completed) / Number(s.total_requests)) * 100)
      : 0;

  const topCards = [
    { label: "בקשות החודש", value: s.total_requests, color: "border-t-blue-500 text-blue-600" },
    { label: "הושלמו החודש", value: s.completed, color: "border-t-green-500 text-green-600" },
    { label: "ממתינות לטיפול", value: s.pending, color: "border-t-amber-400 text-amber-600" },
    { label: "אחוז השלמה", value: `${completionRate}%`, color: "border-t-purple-500 text-purple-600" },
  ];

  const driverCards = [
    { label: "נהגים פעילים", value: `${s.active_drivers} / ${s.total_drivers}`, color: "text-cyan-600" },
    { label: "נציגים פעילים", value: `${s.active_reps} / ${s.total_reps}`, color: "text-indigo-600" },
    { label: "נסיעות בביצוע", value: s.in_progress, color: "text-orange-600" },
    { label: "נדחו החודש", value: s.rejected, color: "text-red-600" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">סטטיסטיקות</h1>
        <p className="mt-1 text-sm text-gray-500">סיכום פעילות המערכת</p>
      </div>

      <section className="grid grid-cols-4 gap-4">
        {topCards.map((c) => (
          <div key={c.label} className={`rounded-xl border border-gray-200 bg-white p-5 border-t-4 ${c.color.split(" ")[0]}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{c.label}</p>
            <p className={`mt-3 text-4xl font-bold ${c.color.split(" ")[1]}`}>{c.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-4 gap-4">
        {driverCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{c.label}</p>
            <p className={`mt-3 text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">בקשות נסיעה — 6 חודשים אחרונים</h2>
        </div>
        {monthly.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">אין נתונים</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3">חודש</th>
                <th className="px-6 py-3">בקשות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthly.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{row.month}</td>
                  <td className="px-6 py-3 text-gray-600 tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
