"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveUser, rejectUser } from "./actions";

const GENDER_LABEL: Record<string, string> = {
  male: "זכר",
  female: "נקבה",
  other: "אחר",
  prefer_not_to_say: "לא מציין",
};

const ROLE_LABEL: Record<string, string> = {
  driver: "נהג",
  representative: "נציג",
};

export type PendingUser = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  national_id: string | null;
  // driver-only fields
  birth_year: number | null;
  gender: string | null;
  location: string | null;
  license_type: string | null;
  license_issue_year: number | null;
  consent_criminal_record: boolean | null;
  owns_vehicle_ambulatory: boolean | null;
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
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-xl">
        <h3 className="font-semibold text-foreground">דחיית {name}</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">סיבה (אופציונלי)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 resize-none"
            placeholder="הסבר קצר..."
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

function UserCard({ user, onDone }: { user: PendingUser; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isDriver = user.role === "driver";

  function handleApprove() {
    startTransition(async () => {
      const result = await approveUser(user.user_id);
      if ("error" in result) toast.error(result.error);
      else { toast.success(`${user.full_name} אושר`); onDone(); }
    });
  }

  function handleReject(_reason: string) {
    startTransition(async () => {
      const result = await rejectUser(user.user_id);
      if ("error" in result) toast.error(result.error);
      else { toast.success(`${user.full_name} נדחה`); setShowReject(false); onDone(); }
    });
  }

  return (
    <>
      {showReject && (
        <RejectModal
          name={user.full_name}
          onConfirm={handleReject}
          onCancel={() => setShowReject(false)}
          isPending={isPending}
        />
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-sm">
            {user.full_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{user.full_name}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isDriver ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDriver && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                {expanded ? "סגור" : "פרטים"}
              </button>
            )}
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              אשר
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={isPending}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              דחה
            </button>
          </div>
        </div>

        {expanded && isDriver && (
          <div className="border-t border-border px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm bg-muted/40">
            <Field label="ת.ז." value={user.national_id} />
            <Field label="שנת לידה" value={user.birth_year?.toString()} />
            <Field label="מגדר" value={user.gender ? GENDER_LABEL[user.gender] : null} />
            <Field label="מיקום" value={user.location} />
            <Field label="סוג רישיון" value={user.license_type} />
            <Field label="שנת הוצאת רישיון" value={user.license_issue_year?.toString()} />
            <Field label="הסכמה לבדיקת עבר" value={user.consent_criminal_record ? "כן" : "לא"} />
            <Field label="רכב אמבולטורי" value={user.owns_vehicle_ambulatory ? "כן" : "לא"} />

            {user.photo_url && (
              <div className="col-span-2 flex flex-col gap-1.5 mt-1">
                <span className="text-xs font-medium text-muted-foreground">תמונת רישיון</span>
                <a href={user.photo_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={user.photo_url}
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

export function AdminApprovalList({ initialUsers }: { initialUsers: PendingUser[] }) {
  const [users, setUsers] = useState(initialUsers);

  const drivers = users.filter((u) => u.role === "driver");
  const reps = users.filter((u) => u.role === "representative");

  function remove(userId: string) {
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">אין בקשות הרשמה ממתינות</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {reps.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">נציגים ממתינים ({reps.length})</p>
          {reps.map((u) => <UserCard key={u.user_id} user={u} onDone={() => remove(u.user_id)} />)}
        </section>
      )}
      {drivers.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">נהגים ממתינים ({drivers.length})</p>
          {drivers.map((u) => <UserCard key={u.user_id} user={u} onDone={() => remove(u.user_id)} />)}
        </section>
      )}
    </div>
  );
}
