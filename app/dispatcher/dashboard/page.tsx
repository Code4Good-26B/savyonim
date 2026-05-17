import Link from "next/link";
import { MOCK_RIDE_REQUESTS, type RideStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<RideStatus, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representitive: "ממתין לנציג",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

const STATUS_COLOR: Record<RideStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  waiting_for_representitive: "bg-purple-100 text-purple-800",
  in_progress: "bg-cyan-100 text-cyan-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function DispatcherDashboard() {
  const total = MOCK_RIDE_REQUESTS.length;
  const pending = MOCK_RIDE_REQUESTS.filter((r) => r.status === "pending").length;
  const inProgress = MOCK_RIDE_REQUESTS.filter((r) => r.status === "in_progress").length;
  const completed = MOCK_RIDE_REQUESTS.filter((r) => r.status === "completed").length;

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
          { label: "סה״כ בקשות", value: total },
          { label: "ממתינות", value: pending },
          { label: "בביצוע", value: inProgress },
          { label: "הושלמו", value: completed },
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
              <th className="px-6 py-3">נוסע</th>
              <th className="px-6 py-3">סטטוס</th>
              <th className="px-6 py-3">נהג משובץ</th>
              <th className="px-6 py-3">זמן איסוף</th>
              <th className="px-6 py-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RIDE_REQUESTS.map((ride) => (
              <tr key={ride.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{ride.passenger.full_name}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ride.status]}`}>
                    {STATUS_LABEL[ride.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{ride.assigned_driver_name ?? "—"}</td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(ride.requested_pickup_at).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/dispatcher/request/${ride.id}`} className="text-blue-600 hover:underline">
                    פרטים
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
