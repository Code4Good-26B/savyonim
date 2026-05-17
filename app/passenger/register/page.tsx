"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MOBILITY_OPTIONS = [
  { value: "none", label: "ללא" },
  { value: "cane", label: "מקל הליכה" },
  { value: "walker", label: "הליכון" },
  { value: "wheelchair", label: "כיסא גלגלים" },
];

const CATEGORY_OPTIONS = [
  { value: "elderly", label: "קשיש" },
  { value: "disability", label: "נכות" },
  { value: "general", label: "כללי" },
];

export default function PassengerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    national_id: "",
    category: "",
    mobility_need: "none",
    mobility_notes: "",
    emergency_contact: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    form.full_name.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.email.trim() !== "" &&
    form.category !== "";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
          national_id: form.national_id || undefined,
          category: form.category,
          mobility_need: form.mobility_need,
          mobility_notes: form.mobility_notes || undefined,
          emergency_contact: form.emergency_contact || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בהרשמה");
      router.push("/passenger/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהרשמה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-6">
      <div>
        <h2 className="font-semibold text-gray-900">הזמנת נסיעה</h2>
        <p className="mt-1 text-sm text-gray-500">
          מספר הטלפון ישמש לזיהוי אוטומטי בפנייה דרך וואטסאפ
        </p>
      </div>

      {/* Personal details */}
      <section className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">פרטים אישיים</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
            שם מלא <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            placeholder="ישראל ישראלי"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              טלפון <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="050-0000000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="national_id" className="text-sm font-medium text-gray-700">תעודת זהות</label>
            <input
              id="national_id"
              type="text"
              placeholder="000000000"
              maxLength={9}
              value={form.national_id}
              onChange={(e) => setForm({ ...form, national_id: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            אימייל <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="emergency_contact" className="text-sm font-medium text-gray-700">
            איש קשר לחירום
          </label>
          <input
            id="emergency_contact"
            type="tel"
            placeholder="050-0000000"
            value={form.emergency_contact}
            onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Category */}
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          קטגוריה <span className="text-red-500">*</span>
        </p>
        <div className="flex gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setForm({ ...form, category: opt.value })}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                form.category === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Mobility */}
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">צרכי ניידות</p>
        <div className="grid grid-cols-2 gap-2">
          {MOBILITY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setForm({ ...form, mobility_need: opt.value })}
              className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                form.mobility_need === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {form.mobility_need !== "none" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mobility_notes" className="text-xs text-gray-500">הערות ניידות</label>
            <input
              id="mobility_notes"
              type="text"
              placeholder="פרט אם נדרשת עזרה מיוחדת..."
              value={form.mobility_notes}
              onChange={(e) => setForm({ ...form, mobility_notes: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        disabled={!isValid || loading}
        onClick={handleSubmit}
        className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${
          isValid && !loading ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" : "bg-blue-600 opacity-50 cursor-not-allowed"
        }`}
      >
        {loading ? "שולח..." : "הרשמה"}
      </button>

      <p className="text-center text-sm text-gray-500">
        כבר רשום?{" "}
        <Link href="/passenger/login" className="text-blue-600 hover:underline">
          כניסה
        </Link>
      </p>
    </div>
  );
}
