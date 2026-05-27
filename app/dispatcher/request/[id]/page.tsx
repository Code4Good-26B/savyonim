import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function RequestDetailPage(props: PageProps<"/dispatcher/request/[id]">) {
  const { id } = await props.params;

  const supabase = createSupabaseClient();
  const { data: ride } = await supabase
    .from("ride_requests")
    .select(`
      id, status, source_address, source_notes, destination_address, destination_notes,
      return_trip_required, requested_pickup_at, rejection_reason,
      caller_full_name, caller_phone, request_for_self, trip_type,
      requested_arrival_at,
      passengers (
        id, full_name, phone, mobility_need, mobility_notes, category
      )
    `)
    .eq("id", id)
    .single();

  if (!ride) notFound();

  const passenger = Array.isArray(ride.passengers) ? ride.passengers[0] : ride.passengers;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dispatcher/requests" className="text-sm text-blue-600 hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">פרטי בקשה</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-700"}`}>
          {STATUS_LABEL[ride.status] ?? ride.status}
        </span>
      </div>

      {passenger ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-medium text-gray-900">פרטי נוסע</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">שם מלא</p>
              <p className="mt-1 text-gray-900">{passenger.full_name}</p>
            </div>
            <div>
              <p className="text-gray-400">טלפון</p>
              <p className="mt-1 text-gray-900">{passenger.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">צורך ניידות</p>
              <p className="mt-1 text-gray-900">{passenger.mobility_need}</p>
            </div>
            {passenger.mobility_notes && (
              <div>
                <p className="text-gray-400">הערות ניידות</p>
                <p className="mt-1 text-gray-900">{passenger.mobility_notes}</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {ride.caller_full_name && !ride.request_for_self ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-medium text-gray-900">פרטי מתקשר</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">שם מתקשר</p>
              <p className="mt-1 text-gray-900">{ride.caller_full_name}</p>
            </div>
            {ride.caller_phone && (
              <div>
                <p className="text-gray-400">טלפון מתקשר</p>
                <p className="mt-1 text-gray-900">{ride.caller_phone}</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
        <h2 className="font-medium text-gray-900">פרטי נסיעה</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">כתובת איסוף</p>
            <p className="mt-1 text-gray-900">{ride.source_address}</p>
          </div>
          <div>
            <p className="text-gray-400">כתובת יעד</p>
            <p className="mt-1 text-gray-900">{ride.destination_address}</p>
          </div>
          {ride.requested_pickup_at && (
            <div>
              <p className="text-gray-400">זמן איסוף</p>
              <p className="mt-1 text-gray-900">
                {new Date(ride.requested_pickup_at).toLocaleString("he-IL")}
              </p>
            </div>
          )}
          {ride.requested_arrival_at && (
            <div>
              <p className="text-gray-400">זמן הגעה מבוקש</p>
              <p className="mt-1 text-gray-900">
                {new Date(ride.requested_arrival_at).toLocaleString("he-IL")}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-400">נסיעת חזור</p>
            <p className="mt-1 text-gray-900">{ride.return_trip_required ? "כן" : "לא"}</p>
          </div>
          {ride.trip_type && (
            <div>
              <p className="text-gray-400">סוג נסיעה</p>
              <p className="mt-1 text-gray-900">{ride.trip_type === "medical" ? "רפואי" : "פנאי"}</p>
            </div>
          )}
          {ride.rejection_reason && (
            <div className="col-span-2">
              <p className="text-gray-400">סיבת דחייה</p>
              <p className="mt-1 text-red-700">{ride.rejection_reason}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
