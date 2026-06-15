import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representative: "ממתין לנציג",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  approved: "bg-blue-50 text-blue-700 border border-blue-100",
  waiting_for_representative: "bg-purple-50 text-purple-700 border border-purple-100",
  in_progress: "bg-cyan-50 text-cyan-700 border border-cyan-100",
  completed: "bg-green-50 text-green-700 border border-green-100",
  rejected: "bg-red-50 text-red-700 border border-red-100",
};

type RideRequestRow = {
  id: string;
  status: string;
  source_address: string;
  destination_address: string;
  requested_pickup_at: string | null;
  caller_full_name: string | null;
};

export default async function DispatcherDashboard() {
  const supabase = createSupabaseClient();

  const [
    { count: total },
    { count: pending },
    { count: inProgress },
    { count: completed },
    { data: recentRides },
  ] = await Promise.all([
    supabase.from("ride_requests").select("*", { count: "exact", head: true }),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from("ride_requests")
      .select("id, status, source_address, destination_address, requested_pickup_at, caller_full_name")
      .order("requested_pickup_at", { ascending: false })
      .limit(10),
  ]);

  const allRides = (recentRides ?? []) as RideRequestRow[];

  const stats = [
    {
      label: "סה״כ בקשות",
      value: total ?? 0,
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: "ממתינות לטיפול",
      value: pending ?? 0,
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "בביצוע כעת",
      value: inProgress ?? 0,
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "הושלמו",
      value: completed ?? 0,
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">דשבורד</h1>
          <p className="mt-1 text-sm text-gray-400">סקירה כללית של מצב הנסיעות</p>
        </div>
        <Link
          href="/representative/requests/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          בקשה חדשה
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">בקשות אחרונות</h2>
          <Link href="/representative/requests" className="text-xs text-blue-600 hover:underline">
            כל הבקשות ←
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-xs text-gray-400 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">שם מתקשר</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
              <th className="px-6 py-3 font-medium">מוצא</th>
              <th className="px-6 py-3 font-medium">זמן איסוף</th>
              <th className="px-6 py-3"><span className="sr-only">פעולות</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allRides.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center text-sm text-gray-400">
                  אין בקשות נסיעה עדיין
                </td>
              </tr>
            ) : (
              allRides.map((ride) => (
                <tr key={ride.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-gray-900">{ride.caller_full_name ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[ride.status] ?? ride.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 max-w-[180px] truncate">{ride.source_address}</td>
                  <td className="px-6 py-3.5 text-gray-500 tabular-nums">
                    {ride.requested_pickup_at
                      ? new Date(ride.requested_pickup_at).toLocaleString("he-IL", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      href={`/representative/request/${ride.id}`}
                      className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      פרטים ←
                    </Link>
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
