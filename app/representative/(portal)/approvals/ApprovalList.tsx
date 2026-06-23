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
  consent_criminal_record: boolean | null;
  owns_vehicle_ambulatory: boolean | null;
  photo_url: string | null;
};

const PROFILE_FIELDS: { key: keyof PendingDriver; label: string }[] = [
  { key: "national_id", label: "ת.ז." },
  { key: "birth_year", label: "שנת לידה" },
  { key: "gender", label: "מגדר" },
  { key: "license_type", label: "סוג רישיון" },
  { key: "license_issue_year", label: "שנת רישיון" },
  { key: "consent_criminal_record", label: "הסכמת עבר" },
  { key: "owns_vehicle_ambulatory", label: "רכב אמבולטורי" },
  { key: "photo_url", label: "תמונת רישיון" },
];

const PROGRESS_WIDTH = [
  "w-0", "w-[12.5%]", "w-[25%]", "w-[37.5%]", "w-[50%]",
  "w-[62.5%]", "w-[75%]", "w-[87.5%]", "w-full",
] as const;

function ProfileCompleteness({ driver }: { driver: PendingDriver }) {
  const missing = PROFILE_FIELDS.filter(
    (f) => driver[f.key] === null || driver[f.key] === undefined,
  );
  const filled = PROFILE_FIELDS.length - missing.length;
  const pct = Math.round((filled / PROFILE_FIELDS.length) * 100);

  return (
    <div className="flex items-center gap-3 mt-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${PROGRESS_WIDTH[filled]} ${pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{pct}%</span>
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {missing.map((f) => (
            <span key={f.key} className="rounded px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 border border-red-100">
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-xl">
        <h3 className="font-semibold text-foreground">דחיית {name}</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">סיבה (אופציונלי)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 resize-none"
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
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
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

  function handleReject(reason: string) {
    startTransition(async () => {
      const result = await rejectDriver(driver.user_id, reason || undefined);
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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-start gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
            {driver.full_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{driver.full_name}</p>
            <p className="text-sm text-muted-foreground">{driver.email ?? "—"}</p>
            <ProfileCompleteness driver={driver} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
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
          <div className="border-t border-border px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm bg-muted/40">
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
                <span className="text-xs font-medium text-muted-foreground">תמונת רישיון</span>
                <a href={driver.photo_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={driver.photo_url}
                    alt="תמונת רישיון"
                    className="max-h-48 rounded-lg border border-border object-contain"
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? "—"}</span>
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
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">אין בקשות הרשמה ממתינות</p>
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
