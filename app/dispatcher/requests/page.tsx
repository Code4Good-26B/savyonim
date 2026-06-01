import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { type RideDriver, assignedDriver } from "./assigned-driver";

export const revalidate = 30;

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

type ServiceZone = { id: string; name: string; region_code: string };

function buildUrl(params: Record<string, string>) {
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
  const qs = new URLSearchParams(filtered).toString();
  return `/dispatcher/requests${qs ? `?${qs}` : ""}`;
}

export default async function RequestsPage(props: PageProps<"/dispatcher/requests">) {
  const searchParams = (await props.searchParams) as Record<string, string>;
  const activeStatus = searchParams?.status ?? "";
  const activeZone = searchParams?.zone ?? "";
  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseClient();

  const [zonesResult, ridesResult] = await Promise.all([
    supabase.from("service_zones").select("id, name, region_code").order("name"),
    (async () => {
      let q = supabase
        .from("ride_requests")
        .select("id, status, source_address, destination_address, requested_pickup_at, caller_full_name, caller_phone, rides(status, drivers(users(full_name)))", { count: "exact" })
        .order("requested_pickup_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (activeStatus) q = q.eq("status", activeStatus);
      if (activeZone) q = q.eq("service_zone_id", activeZone);
      return q;
    })(),
  ]);

  const zones = (zonesResult.data ?? []) as ServiceZone[];
  const rides = (ridesResult.data ?? []) as RideRequestRow[];
  const totalCount = ridesResult.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const error = ridesResult.error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">בקשות נסיעה</h1>
        <Link
          href="/dispatcher/requests/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + בקשת נסיעה חדשה
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildUrl({ status: f.value, zone: activeZone, page: "1" })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeStatus === f.value
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {zones.length > 0 && (
          <div className="flex gap-2">
            <Link
              href={buildUrl({ status: activeStatus, zone: "", page: "1" })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeZone === ""
                  ? "bg-slate-700 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-slate-400 hover:text-slate-700"
              }`}
            >
              כל האזורים
            </Link>
            {zones.map((z) => (
              <Link
                key={z.id}
                href={buildUrl({ status: activeStatus, zone: z.id, page: "1" })}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  activeZone === z.id
                    ? "bg-slate-700 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-slate-400 hover:text-slate-700"
                }`}
              >
                {z.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          שגיאה בטעינת הבקשות: {error.message}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-right text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-3">שם מתקשר</th>
              <th className="px-6 py-3">טלפון</th>
              <th className="px-6 py-3">מוצא</th>
              <th className="px-6 py-3">יעד</th>
              <th className="px-6 py-3">סטטוס</th>
              <th className="px-6 py-3">נהג משויך</th>
              <th className="px-6 py-3">זמן איסוף</th>
              <th className="px-6 py-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rides.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  אין בקשות נסיעה
                </td>
              </tr>
            ) : (
              rides.map((ride) => (
                <tr key={ride.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{ride.caller_full_name ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-600">{ride.caller_phone ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">{ride.source_address}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">{ride.destination_address}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABEL[ride.status] ?? ride.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{assignedDriver(ride.rides)}</td>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-xs text-gray-400">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} מתוך {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ status: activeStatus, zone: activeZone, page: String(page - 1) })}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  ← הקודם
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ status: activeStatus, zone: activeZone, page: String(page + 1) })}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
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
