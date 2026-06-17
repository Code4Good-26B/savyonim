"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { MobilityNeed, PassengerCategory } from "@/lib/intake-contract";
import { type FormState, EMPTY_FORM, isValid, buildPayload } from "./form-logic";
import { Button } from "@/components/ui/button";

type ServiceZone = { id: string; name: string; region_code: string };

const CATEGORY_OPTIONS: { value: PassengerCategory; label: string }[] = [
  { value: "wounded_soldier", label: "פצוע מלחמה" },
  { value: "idf_disabled", label: 'נכה צה"ל' },
  { value: "holocaust_survivor", label: "ניצול שואה" },
  { value: "cancer_patient", label: "חולה סרטן" },
  { value: "dialysis_patient", label: "מטופל דיאליזה" },
  { value: "other", label: "אחר" },
];

const MOBILITY_OPTIONS: { value: MobilityNeed; label: string }[] = [
  { value: "wheelchair", label: "כיסא גלגלים" },
  { value: "walking", label: "הולך ברגל (ללא עזרה)" },
  { value: "cane", label: "הולך עם מקל" },
  { value: "walker", label: "הולך עם הליכון" },
];

const WAITING_OPTIONS = [
  { value: "30", label: "30 דקות" },
  { value: "60", label: "60 דקות" },
  { value: "90", label: "90 דקות" },
  { value: "120", label: "120 דקות" },
  { value: "other", label: "אחר" },
];

// Shared style constants (design-system tokens)
const card = "rounded-xl border border-border bg-card p-6 flex flex-col gap-5";
const sectionTitle = "text-xs font-semibold uppercase tracking-widest text-muted-foreground";
const fieldWrap = "flex flex-col gap-1.5";
const label = "text-sm font-medium text-foreground";
const input =
  "w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
const select =
  "w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
const radioRow = "flex items-center gap-2";
const radioLabel = "text-sm text-foreground cursor-pointer";

export default function NewRequestForm({ zones }: { zones: ServiceZone[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const valid = isValid(form);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/intake/ride-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer dev-commbox-api-key",
        },
        body: JSON.stringify(buildPayload(form)),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? "אירעה שגיאה בשליחת הבקשה");
        return;
      }

      setSuccessId(json.ride_request_id);
    } catch {
      setApiError("לא ניתן להתחבר לשרת. נסה שוב.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="max-w-lg">
        <div className={card}>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl font-bold">
              ✓
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-foreground">הבקשה נשלחה בהצלחה</h2>
              <p className="text-sm text-muted-foreground">
                מספר בקשה:{" "}
                <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {successId}
                </span>
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => router.push("/representative/requests")}>
                לרשימת הבקשות
              </Button>
              <Button
                variant="outline"
                onClick={() => { setSuccessId(null); setForm(EMPTY_FORM); }}
              >
                בקשה חדשה
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/representative/requests" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="w-4 h-4" />
          חזרה לרשימה
        </Link>
      </div>

      <div>
        <h2>בקשת נסיעה חדשה</h2>
        <p className="mt-1 text-sm text-muted-foreground">מלא את כל השדות המסומנים ב-<span className="text-destructive">*</span></p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Section 1: Caller Details ───────────────────────────── */}
        <div className={card}>
          <p className={sectionTitle}>פרטי המתקשר</p>

          <div className={fieldWrap}>
            <label className={label}>שם מלא <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.caller_full_name}
              onChange={(e) => set({ caller_full_name: e.target.value })}
              className={input}
              placeholder="ישראל ישראלי"
            />
          </div>

          <div className={fieldWrap}>
            <label className={label}>מספר תעודת זהות <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.caller_id_number}
              onChange={(e) => set({ caller_id_number: e.target.value })}
              className={input}
              placeholder="123456789"
            />
          </div>

          <div className={fieldWrap}>
            <label className={label}>טלפון נייד <span className="text-destructive">*</span></label>
            <input
              type="tel"
              value={form.caller_phone}
              onChange={(e) => set({ caller_phone: e.target.value })}
              className={input}
              placeholder="050-0000000"
            />
          </div>

          <div className={fieldWrap}>
            <label className={label}>הבקשה עבור... <span className="text-destructive">*</span></label>
            <div className="flex flex-col gap-2 pt-1">
              <label className={radioRow}>
                <input
                  type="radio"
                  name="request_for_self"
                  checked={form.request_for_self === true}
                  onChange={() => set({ request_for_self: true })}
                  className="h-4 w-4 accent-primary"
                />
                <span className={radioLabel}>המתקשר עצמו</span>
              </label>
              <label className={radioRow}>
                <input
                  type="radio"
                  name="request_for_self"
                  checked={form.request_for_self === false}
                  onChange={() => set({ request_for_self: false })}
                  className="h-4 w-4 accent-primary"
                />
                <span className={radioLabel}>אדם אחר</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Section 2: Passenger Details (conditional) ─────────── */}
        {form.request_for_self === false && (
          <div className={card}>
            <p className={sectionTitle}>פרטי הנוסע</p>

            <div className={fieldWrap}>
              <label className={label}>שם מלא <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={form.passenger_full_name}
                onChange={(e) => set({ passenger_full_name: e.target.value })}
                className={input}
                placeholder="ישראל ישראלי"
              />
            </div>

            <div className={fieldWrap}>
              <label className={label}>מספר תעודת זהות <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={form.passenger_id_number}
                onChange={(e) => set({ passenger_id_number: e.target.value })}
                className={input}
                placeholder="123456789"
              />
            </div>

            <div className={fieldWrap}>
              <label className={label}>טלפון <span className="text-destructive">*</span></label>
              <input
                type="tel"
                value={form.passenger_phone}
                onChange={(e) => set({ passenger_phone: e.target.value })}
                className={input}
                placeholder="050-0000000"
              />
            </div>

            <div className={fieldWrap}>
              <label className={label}>מצב ניידות <span className="text-destructive">*</span></label>
              <div className="flex flex-col gap-2 pt-1">
                {MOBILITY_OPTIONS.map((opt) => (
                  <label key={opt.value} className={radioRow}>
                    <input
                      type="radio"
                      name="passenger_mobility_need"
                      checked={form.passenger_mobility_need === opt.value}
                      onChange={() => set({ passenger_mobility_need: opt.value })}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className={radioLabel}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={fieldWrap}>
              <label className={label}>קטגוריה <span className="text-destructive">*</span></label>
              <select
                value={form.passenger_category}
                onChange={(e) => set({ passenger_category: e.target.value as PassengerCategory })}
                className={select}
              >
                <option value="">בחר קטגוריה...</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Section 3: Category (when caller = passenger) ──────── */}
        {form.request_for_self === true && (
          <div className={card}>
            <p className={sectionTitle}>קטגוריה</p>
            <div className={fieldWrap}>
              <label className={label}>קטגוריה <span className="text-destructive">*</span></label>
              <select
                value={form.self_category}
                onChange={(e) => set({ self_category: e.target.value as PassengerCategory })}
                className={select}
              >
                <option value="">בחר קטגוריה...</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Section 4: Trip Type ────────────────────────────────── */}
        <div className={card}>
          <p className={sectionTitle}>סוג נסיעה</p>
          <div className="flex flex-col gap-2">
            <label className={radioRow}>
              <input
                type="radio"
                name="trip_type"
                checked={form.trip_type === "medical"}
                onChange={() => set({ trip_type: "medical" })}
                className="h-4 w-4 accent-primary"
              />
              <span className={radioLabel}>טיפול רפואי</span>
            </label>
            <label className={radioRow}>
              <input
                type="radio"
                name="trip_type"
                checked={form.trip_type === "leisure"}
                onChange={() => set({ trip_type: "leisure" })}
                className="h-4 w-4 accent-primary"
              />
              <span className={radioLabel}>פנאי / נופש</span>
            </label>
          </div>
        </div>

        {/* ── Section 5: Trip Details ─────────────────────────────── */}
        <div className={card}>
          <p className={sectionTitle}>פרטי הנסיעה</p>

          <div className={fieldWrap}>
            <label className={label}>כתובת מוצא <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.source_address}
              onChange={(e) => set({ source_address: e.target.value })}
              className={input}
              placeholder="רחוב, עיר"
            />
          </div>

          <div className={fieldWrap}>
            <label className={label}>כתובת יעד <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={form.destination_address}
              onChange={(e) => set({ destination_address: e.target.value })}
              className={input}
              placeholder="רחוב, עיר"
            />
          </div>

          <div className={fieldWrap}>
            <label className={label}>תאריך נסיעה <span className="text-destructive">*</span></label>
            <input
              type="date"
              value={form.travel_date}
              onChange={(e) => set({ travel_date: e.target.value })}
              className={input}
            />
          </div>

          {form.trip_type === "medical" && (
            <>
              <div className={fieldWrap}>
                <label className={label}>שעת הגעה נדרשת <span className="text-destructive">*</span></label>
                <input
                  type="time"
                  value={form.required_arrival_time}
                  onChange={(e) => set({ required_arrival_time: e.target.value })}
                  className={input}
                />
              </div>
              <div className={fieldWrap}>
                <label className={label}>
                  שעת יציאה משוערת{" "}
                  <span className="text-gray-400 font-normal text-xs">(אופציונלי)</span>
                </label>
                <input
                  type="time"
                  value={form.estimated_departure_time}
                  onChange={(e) => set({ estimated_departure_time: e.target.value })}
                  className={input}
                />
              </div>
            </>
          )}

          {form.trip_type === "leisure" && (
            <>
              <div className={fieldWrap}>
                <label className={label}>תחילת חלון זמן <span className="text-destructive">*</span></label>
                <input
                  type="time"
                  value={form.leisure_window_start}
                  onChange={(e) => set({ leisure_window_start: e.target.value })}
                  className={input}
                />
              </div>
              <div className={fieldWrap}>
                <label className={label}>סיום חלון זמן <span className="text-destructive">*</span></label>
                <input
                  type="time"
                  value={form.leisure_window_end}
                  onChange={(e) => set({ leisure_window_end: e.target.value })}
                  className={input}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Section 6: Waiting Time ─────────────────────────────── */}
        <div className={card}>
          <p className={sectionTitle}>המתנה ביעד</p>
          <div className="flex flex-col gap-2">
            <label className={radioRow}>
              <input
                type="radio"
                name="has_waiting"
                checked={form.has_waiting === false}
                onChange={() => set({ has_waiting: false, waiting_duration: "", waiting_other_minutes: "" })}
                className="h-4 w-4 accent-primary"
              />
              <span className={radioLabel}>ללא המתנה</span>
            </label>
            <label className={radioRow}>
              <input
                type="radio"
                name="has_waiting"
                checked={form.has_waiting === true}
                onChange={() => set({ has_waiting: true })}
                className="h-4 w-4 accent-primary"
              />
              <span className={radioLabel}>המתנה ביעד</span>
            </label>
          </div>

          {form.has_waiting === true && (
            <div className={fieldWrap}>
              <label className={label}>משך המתנה <span className="text-destructive">*</span></label>
              <select
                value={form.waiting_duration}
                onChange={(e) => set({ waiting_duration: e.target.value, waiting_other_minutes: "" })}
                className={select}
              >
                <option value="">בחר משך...</option>
                {WAITING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {form.waiting_duration === "other" && (
                <input
                  type="number"
                  min={1}
                  value={form.waiting_other_minutes}
                  onChange={(e) => set({ waiting_other_minutes: e.target.value })}
                  className={input}
                  placeholder="הכנס מספר דקות"
                />
              )}
            </div>
          )}
        </div>

        {/* ── Section 7: Return Trip ──────────────────────────────── */}
        <div className={card}>
          <p className={sectionTitle}>נסיעת חזרה</p>
          <div className="flex flex-col gap-2">
            <label className={radioRow}>
              <input
                type="radio"
                name="return_trip"
                checked={form.return_trip_required === false}
                onChange={() => set({ return_trip_required: false })}
                className="h-4 w-4 accent-primary"
              />
              <span className={radioLabel}>כיוון אחד בלבד</span>
            </label>
            <label className={radioRow}>
              <input
                type="radio"
                name="return_trip"
                checked={form.return_trip_required === true}
                onChange={() => set({ return_trip_required: true })}
                className="h-4 w-4 accent-primary"
              />
              <span className={radioLabel}>הלוך ושוב — חובה</span>
            </label>
          </div>
          {form.return_trip_required === true && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              אם לא ניתן לספק נסיעת חזרה, בקשה זו תידחה.
            </div>
          )}
        </div>

        {/* ── Service Zone (optional) ─────────────────────────────── */}
        {zones.length > 0 && (
          <div className={card}>
            <p className={sectionTitle}>אזור שירות</p>
            <div className={fieldWrap}>
              <select
                value={form.service_zone_id}
                onChange={(e) => set({ service_zone_id: e.target.value })}
                className={select}
              >
                <option value="">בחר אזור שירות...</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.region_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Error + Submit ──────────────────────────────────────── */}
        {apiError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {valid ? "הטופס מוכן לשליחה" : "יש למלא את כל השדות הנדרשים לפני השליחה"}
          </p>
          <Button type="submit" disabled={!valid || submitting} className="gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "שולח..." : "שלח בקשה"}
          </Button>
        </div>
      </form>
    </div>
  );
}
