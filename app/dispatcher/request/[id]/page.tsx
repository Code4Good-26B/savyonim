import Link from "next/link";
import { MOCK_RIDE_REQUESTS, type RideStatus } from "@/lib/mock-data";
import { notFound } from "next/navigation";

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

export default async function RequestDetailPage(props: PageProps<"/dispatcher/request/[id]">) {
  const { id } = await props.params;
  const ride = MOCK_RIDE_REQUESTS.find((r) => r.id === id);

  if (!ride) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dispatcher/requests" className="text-sm text-blue-600 hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">פרטי בקשה</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[ride.status]}`}>
          {STATUS_LABEL[ride.status]}
        </span>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
        <h2 className="font-medium text-gray-900">פרטי נוסע</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">שם מלא</p>
            <p className="mt-1 text-gray-900">{ride.passenger.full_name}</p>
          </div>
          <div>
            <p className="text-gray-400">טלפון</p>
            <p className="mt-1 text-gray-900">{ride.passenger.phone}</p>
          </div>
          <div>
            <p className="text-gray-400">צורך ניידות</p>
            <p className="mt-1 text-gray-900">{ride.passenger.mobility_need}</p>
          </div>
          {ride.passenger.mobility_notes && (
            <div>
              <p className="text-gray-400">הערות ניידות</p>
              <p className="mt-1 text-gray-900">{ride.passenger.mobility_notes}</p>
            </div>
          )}
        </div>
      </section>

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
          <div>
            <p className="text-gray-400">זמן איסוף</p>
            <p className="mt-1 text-gray-900">
              {new Date(ride.requested_pickup_at).toLocaleString("he-IL")}
            </p>
          </div>
          <div>
            <p className="text-gray-400">נסיעת חזור</p>
            <p className="mt-1 text-gray-900">{ride.return_trip_required ? "כן" : "לא"}</p>
          </div>
          {ride.assigned_driver_name && (
            <div>
              <p className="text-gray-400">נהג משובץ</p>
              <p className="mt-1 text-gray-900">{ride.assigned_driver_name}</p>
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
