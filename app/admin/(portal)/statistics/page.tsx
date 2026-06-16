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
    {
      label: "בקשות החודש",
      value: s.total_requests,
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: "הושלמו החודש",
      value: s.completed,
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "ממתינות לטיפול",
      value: s.pending,
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "אחוז השלמה",
      value: `${completionRate}%`,
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
  ];

  const secondCards = [
    {
      label: "נהגים פעילים",
      value: `${s.active_drivers} / ${s.total_drivers}`,
      icon: (
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "נציגים פעילים",
      value: `${s.active_reps} / ${s.total_reps}`,
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: "נסיעות בביצוע",
      value: s.in_progress,
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "נדחו החודש",
      value: s.rejected,
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">סטטיסטיקות</h1>
        <p className="mt-1 text-sm text-gray-400">סיכום פעילות המערכת</p>
      </div>

      <section className="grid grid-cols-4 gap-4">
        {topCards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{c.label}</span>
              {c.icon}
            </div>
            <p className="text-3xl font-semibold text-gray-900">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-4 gap-4">
        {secondCards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{c.label}</span>
              {c.icon}
            </div>
            <p className="text-3xl font-semibold text-gray-900">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-white border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">בקשות נסיעה — 6 חודשים אחרונים</h2>
        </div>
        {monthly.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">אין נתונים</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
                <th className="px-6 py-3 font-medium">חודש</th>
                <th className="px-6 py-3 font-medium">בקשות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthly.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-gray-900">{row.month}</td>
                  <td className="px-6 py-3.5 text-gray-500 tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
