import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { type RideDriver, assignedDriver } from "./assigned-driver";

const PAGE_SIZE = 20;

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

const STATUS_FILTERS = [
  { label: "הכל", value: "" },
  { label: "ממתין", value: "pending" },
  { label: "מאושר", value: "approved" },
  { label: "בדרך", value: "in_progress" },
  { label: "הושלם", value: "completed" },
  { label: "נדחה", value: "rejected" },
];

type RideRequestRow = {
  id: string;
  status: string;
  source_address: string;
  destination_address: string;
  requested_pickup_at: string | null;
  caller_full_name: string | null;
  caller_phone: string | null;
  rides: RideDriver[];
};

function buildUrl(params: Record<string, string>) {
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
  const qs = new URLSearchParams(filtered).toString();
  return `/dispatcher/requests${qs ? `?${qs}` : ""}`;
}

export default async function RequestsPage(props: PageProps<"/dispatcher/requests">) {
  const searchParams = (await props.searchParams) as Record<string, string>;
  const activeStatus = searchParams?.status ?? "";
  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseClient();

  let q = supabase
    .from("ride_requests")
    .select(
      "id, status, source_address, destination_address, requested_pickup_at, caller_full_name, caller_phone, rides(status, drivers(users(full_name)))",
      { count: "exact" },
    )
    .order("requested_pickup_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (activeStatus) q = q.eq("status", activeStatus);

  const ridesResult = await q;

  const rides = (ridesResult.data ?? []) as RideRequestRow[];
  const totalCount = ridesResult.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const error = ridesResult.error;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">בקשות נסיעה</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount > 0 ? `${totalCount} בקשות סה״כ` : "אין בקשות עדיין"}
          </p>
        </div>
        <Link
          href="/dispatcher/requests/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          בקשה חדשה
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">סטטוס</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildUrl({ status: f.value, page: "1" })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeStatus === f.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          שגיאה בטעינת הבקשות: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-6 py-3.5">שם מתקשר</th>
              <th className="px-6 py-3.5">טלפון</th>
              <th className="px-6 py-3.5">מוצא</th>
              <th className="px-6 py-3.5">יעד</th>
              <th className="px-6 py-3.5">סטטוס</th>
              <th className="px-6 py-3.5">נהג משויך</th>
              <th className="px-6 py-3.5">זמן איסוף</th>
              <th className="px-6 py-3.5 sr-only">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rides.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <p className="text-gray-400 text-sm">אין בקשות נסיעה התואמות את הסינון</p>
                  <Link href="/dispatcher/requests/new" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                    צור בקשה חדשה →
                  </Link>
                </td>
              </tr>
            ) : (
              rides.map((ride) => (
                <tr key={ride.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900">{ride.caller_full_name ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-500 tabular-nums">{ride.caller_phone ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-[140px] truncate">{ride.source_address}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-[140px] truncate">{ride.destination_address}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABEL[ride.status] ?? ride.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{assignedDriver(ride.rides)}</td>
                  <td className="px-6 py-4 text-gray-500 tabular-nums">
                    {ride.requested_pickup_at
                      ? new Date(ride.requested_pickup_at).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-left">
                    <Link
                      href={`/dispatcher/request/${ride.id}`}
                      className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 opacity-0 group-hover:opacity-100 hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                      פרטים
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-400">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} מתוך {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ status: activeStatus, page: String(page - 1) })}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  ← הקודם
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ status: activeStatus, page: String(page + 1) })}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  הבא →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
