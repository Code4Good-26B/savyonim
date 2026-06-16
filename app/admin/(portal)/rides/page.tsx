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

const STATUS_FILTERS = ["", "pending", "approved", "in_progress", "completed", "rejected"] as const;
const STATUS_FILTER_LABEL: Record<string, string> = {
  "": "הכל",
  pending: "ממתין",
  approved: "מאושר",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

type RideRow = {
  id: string;
  status: string;
  source_address: string;
  destination_address: string;
  requested_pickup_at: string | null;
  caller_full_name: string | null;
  caller_phone: string | null;
};

export default async function AdminRidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const activeStatus = params.status ?? "";

  const supabase = createSupabaseClient();
  let q = supabase
    .from("ride_requests")
    .select("id, status, source_address, destination_address, requested_pickup_at, caller_full_name, caller_phone")
    .order("requested_pickup_at", { ascending: false })
    .limit(50);

  if (activeStatus) q = q.eq("status", activeStatus);

  const { data, count: total } = await supabase
    .from("ride_requests")
    .select("*", { count: "exact", head: true });

  const { data: rides } = await q;
  const allRides = (rides ?? []) as RideRow[];

  function buildUrl(status: string) {
    return `/admin/rides${status ? `?status=${status}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">נסיעות</h1>
        <p className="mt-1 text-sm text-gray-400">סה״כ {total ?? 0} בקשות במערכת</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <a
            key={s}
            href={buildUrl(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeStatus === s
                ? "bg-slate-900 text-white"
                : "bg-white border border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-800"
            }`}
          >
            {STATUS_FILTER_LABEL[s]}
          </a>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
              <th className="px-6 py-3 font-medium">שם מתקשר</th>
              <th className="px-6 py-3 font-medium">טלפון</th>
              <th className="px-6 py-3 font-medium">מוצא</th>
              <th className="px-6 py-3 font-medium">זמן איסוף</th>
              <th className="px-6 py-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allRides.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">אין בקשות</td></tr>
            ) : (
              allRides.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.caller_full_name ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-500 tabular-nums">{r.caller_phone ?? "—"}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{r.source_address}</td>
                  <td className="px-6 py-4 text-gray-500 tabular-nums">
                    {r.requested_pickup_at
                      ? new Date(r.requested_pickup_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
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
