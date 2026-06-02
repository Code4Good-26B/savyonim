import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representitive: "ממתין לנציג",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  waiting_for_representitive: "bg-purple-100 text-purple-800",
  in_progress: "bg-cyan-100 text-cyan-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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

  const [{ count: total }, { count: pending }, { count: inProgress }, { count: completed }, { data: recentRides }] =
    await Promise.all([
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">דשבורד</h1>
        <Link
          href="/dispatcher/requests/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + בקשת נסיעה חדשה
        </Link>
      </div>

      <section className="grid grid-cols-4 gap-4">
        {[
          { label: "סה״כ בקשות", value: total ?? 0 },
          { label: "ממתינות", value: pending ?? 0 },
          { label: "בביצוע", value: inProgress ?? 0 },
          { label: "הושלמו", value: completed ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-medium text-gray-900">בקשות אחרונות</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-right text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-3">שם מתקשר</th>
              <th className="px-6 py-3">סטטוס</th>
              <th className="px-6 py-3">מוצא</th>
              <th className="px-6 py-3">זמן איסוף</th>
              <th className="px-6 py-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {allRides.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  אין בקשות נסיעה עדיין
                </td>
              </tr>
            ) : (
              allRides.map((ride) => (
                <tr key={ride.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{ride.caller_full_name ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABEL[ride.status] ?? ride.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-[180px] truncate">{ride.source_address}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {ride.requested_pickup_at
                      ? new Date(ride.requested_pickup_at).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dispatcher/request/${ride.id}`} className="text-blue-600 hover:underline">
                      פרטים
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
