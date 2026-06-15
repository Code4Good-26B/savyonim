import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AutoRefresh } from "./AutoRefresh";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representative: "ממתין לנציג",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  approved: "bg-blue-100 text-blue-800 border border-blue-200",
  waiting_for_representative: "bg-purple-100 text-purple-800 border border-purple-200",
  in_progress: "bg-cyan-100 text-cyan-800 border border-cyan-200",
  completed: "bg-green-100 text-green-800 border border-green-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
};

const MOBILITY_LABEL: Record<string, string> = {
  walking: "הולך ברגל",
  wheelchair: "כיסא גלגלים",
  cane: "מקל הליכה",
  walker: "הליכון",
};

const CATEGORY_LABEL: Record<string, string> = {
  wounded_soldier: "פצוע מלחמה",
  idf_disabled: 'נכה צה"ל',
  holocaust_survivor: "ניצול שואה",
  cancer_patient: "חולה סרטן",
  dialysis_patient: "מטופל דיאליזה",
  other: "אחר",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-6 py-3.5">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </section>
  );
}

export default async function RequestDetailPage(props: { params: Promise<{ id: string }> }) {
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
      <AutoRefresh />

      {/* Breadcrumb + status */}
      <div className="flex items-center justify-between">
        <Link href="/representative/requests" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          חזרה לרשימה
        </Link>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}>
          {STATUS_LABEL[ride.status] ?? ride.status}
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900">פרטי בקשה</h1>

      {/* Caller / Passenger */}
      {passenger ? (
        <Section
          title="פרטי הנוסע"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="שם מלא" value={passenger.full_name} />
            <Field label="טלפון" value={passenger.phone} />
            <Field label="ניידות" value={MOBILITY_LABEL[passenger.mobility_need] ?? passenger.mobility_need} />
            <Field label="קטגוריה" value={CATEGORY_LABEL[passenger.category ?? ""] ?? passenger.category} />
            {passenger.mobility_notes && (
              <div className="col-span-2">
                <Field label="הערות ניידות" value={passenger.mobility_notes} />
              </div>
            )}
          </div>
        </Section>
      ) : null}

      {ride.caller_full_name && !ride.request_for_self && (
        <Section
          title="פרטי המתקשר"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="שם מתקשר" value={ride.caller_full_name} />
            {ride.caller_phone && <Field label="טלפון" value={ride.caller_phone} />}
          </div>
        </Section>
      )}

      {/* Trip details */}
      <Section
        title="פרטי הנסיעה"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <Field label="כתובת מוצא" value={ride.source_address} />
          <Field label="כתובת יעד" value={ride.destination_address} />
          {ride.requested_pickup_at && (
            <Field
              label="זמן איסוף"
              value={new Date(ride.requested_pickup_at).toLocaleString("he-IL")}
            />
          )}
          {ride.requested_arrival_at && (
            <Field
              label="שעת הגעה מבוקשת"
              value={new Date(ride.requested_arrival_at).toLocaleString("he-IL")}
            />
          )}
          {ride.trip_type && (
            <Field label="סוג נסיעה" value={ride.trip_type === "medical" ? "רפואי" : "פנאי"} />
          )}
          <Field label="נסיעת חזרה" value={ride.return_trip_required ? "כן" : "לא"} />
          {ride.source_notes && (
            <div className="col-span-2">
              <Field label="הערות מוצא" value={ride.source_notes} />
            </div>
          )}
          {ride.destination_notes && (
            <div className="col-span-2">
              <Field label="הערות יעד" value={ride.destination_notes} />
            </div>
          )}
        </div>
      </Section>

      {/* Rejection reason */}
      {ride.rejection_reason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-1.5">סיבת דחייה</p>
          <p className="text-sm text-red-800">{ride.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}
