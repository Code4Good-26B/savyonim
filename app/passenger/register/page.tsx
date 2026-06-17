"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

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
    password: "",
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
    form.password.trim().length >= 6 &&
    form.category !== "";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();

      // 1. Register in Supabase Auth first
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!authData.user) throw new Error("שגיאה ברישום המשתמש");

      // 2. Insert passenger details in public database
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
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-6">
      <div>
        <h2 className="font-semibold text-foreground">הזמנת נסיעה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          מספר הטלפון ישמש לזיהוי אוטומטי בפנייה דרך וואטסאפ
        </p>
      </div>

      {/* Personal details */}
      <section className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">פרטים אישיים</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm font-medium text-foreground">
            שם מלא <span className="text-destructive">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            placeholder="ישראל ישראלי"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              טלפון <span className="text-destructive">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="050-0000000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="national_id" className="text-sm font-medium text-foreground">תעודת זהות</label>
            <input
              id="national_id"
              type="text"
              placeholder="000000000"
              maxLength={9}
              value={form.national_id}
              onChange={(e) => setForm({ ...form, national_id: e.target.value })}
              className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            אימייל <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            סיסמה <span className="text-destructive">*</span>
          </label>
          <input
            id="password"
            type="password"
            placeholder="לפחות 6 תווים"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="emergency_contact" className="text-sm font-medium text-foreground">
            איש קשר לחירום
          </label>
          <input
            id="emergency_contact"
            type="tel"
            placeholder="050-0000000"
            value={form.emergency_contact}
            onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
            className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
          />
        </div>
      </section>

      {/* Category */}
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          קטגוריה <span className="text-destructive">*</span>
        </p>
        <div className="flex gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setForm({ ...form, category: opt.value })}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                form.category === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Mobility */}
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">צרכי ניידות</p>
        <div className="grid grid-cols-2 gap-2">
          {MOBILITY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setForm({ ...form, mobility_need: opt.value })}
              className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                form.mobility_need === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {form.mobility_need !== "none" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mobility_notes" className="text-xs text-muted-foreground">הערות ניידות</label>
            <input
              id="mobility_notes"
              type="text"
              placeholder="פרט אם נדרשת עזרה מיוחדת..."
              value={form.mobility_notes}
              onChange={(e) => setForm({ ...form, mobility_notes: e.target.value })}
              className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
            />
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-destructive/5 border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <button
        type="button"
        disabled={!isValid || loading}
        onClick={handleSubmit}
        className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${
          isValid && !loading ? "bg-primary hover:bg-primary/90 cursor-pointer" : "bg-primary opacity-50 cursor-not-allowed"
        }`}
      >
        {loading ? "שולח..." : "הרשמה"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        כבר רשום?{" "}
        <Link href="/passenger/login" className="text-primary hover:underline">
          כניסה
        </Link>
      </p>
    </div>
  );
}
