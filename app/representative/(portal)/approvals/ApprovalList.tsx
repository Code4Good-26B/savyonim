"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveDriver, rejectDriver } from "./actions";

const GENDER_LABEL: Record<string, string> = {
  male: "זכר",
  female: "נקבה",
  other: "אחר",
  prefer_not_to_say: "לא מציין",
};

export type PendingDriver = {
  user_id: string;
  full_name: string;
  email: string | null;
  national_id: string | null;
  birth_year: number | null;
  gender: string | null;
  location: string | null;
  license_type: string | null;
  license_issue_year: number | null;
  consent_criminal_record: boolean;
  owns_vehicle_ambulatory: boolean;
  photo_url: string | null;
};

function RejectModal({
  name,
  onConfirm,
  onCancel,
  isPending,
}: {
  name: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 flex flex-col gap-4 shadow-xl">
        <h3 className="font-semibold text-gray-900">דחיית {name}</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">סיבה (אופציונלי)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none"
            placeholder="הסבר קצר לנהג..."
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "דוחה..." : "דחה"}
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverCard({ driver, onDone }: { driver: PendingDriver; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [rejectTarget, setRejectTarget] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      const result = await approveDriver(driver.user_id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${driver.full_name} אושר בהצלחה`);
        onDone();
      }
    });
  }

  function handleReject(_reason: string) {
    startTransition(async () => {
      const result = await rejectDriver(driver.user_id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${driver.full_name} נדחה`);
        setRejectTarget(false);
        onDone();
      }
    });
  }

  return (
    <>
      {rejectTarget && (
        <RejectModal
          name={driver.full_name}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(false)}
          isPending={isPending}
        />
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
            {driver.full_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{driver.full_name}</p>
            <p className="text-sm text-gray-500">{driver.email ?? "—"}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {expanded ? "סגור" : "פרטים"}
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              אשר
            </button>
            <button
              onClick={() => setRejectTarget(true)}
              disabled={isPending}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              דחה
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100 px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm bg-gray-50">
            <Field label="ת.ז." value={driver.national_id} />
            <Field label="שנת לידה" value={driver.birth_year?.toString()} />
            <Field label="מגדר" value={driver.gender ? GENDER_LABEL[driver.gender] : null} />
            <Field label="מיקום" value={driver.location} />
            <Field label="סוג רישיון" value={driver.license_type} />
            <Field label="שנת הוצאת רישיון" value={driver.license_issue_year?.toString()} />
            <Field label="הסכמה לבדיקת עבר" value={driver.consent_criminal_record ? "כן" : "לא"} />
            <Field label="רכב אמבולטורי" value={driver.owns_vehicle_ambulatory ? "כן" : "לא"} />

            {driver.photo_url && (
              <div className="col-span-2 flex flex-col gap-1.5 mt-1">
                <span className="text-xs font-medium text-gray-500">תמונת רישיון</span>
                <a href={driver.photo_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={driver.photo_url}
                    alt="תמונת רישיון"
                    className="max-h-48 rounded-lg border border-gray-200 object-contain"
                  />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-gray-900">{value ?? "—"}</span>
    </div>
  );
}

export function ApprovalList({ initialDrivers }: { initialDrivers: PendingDriver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);

  function remove(userId: string) {
    setDrivers((prev) => prev.filter((d) => d.user_id !== userId));
  }

  if (drivers.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-gray-400">אין בקשות הרשמה ממתינות</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {drivers.map((d) => (
        <DriverCard key={d.user_id} driver={d} onDone={() => remove(d.user_id)} />
      ))}
    </div>
  );
}
