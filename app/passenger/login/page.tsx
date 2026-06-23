"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type LoginMethod = "password" | "otp";

export default function PassengerLoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>("otp");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      router.push("/passenger/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בכניסה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-6">
      <div className="flex rounded-lg border border-border p-1 gap-1">
        <button
          type="button"
          onClick={() => setMethod("otp")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            method === "otp" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          קוד לנייד
        </button>
        <button
          type="button"
          onClick={() => setMethod("password")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            method === "password" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          שם משתמש וסיסמה
        </button>
      </div>

      {method === "otp" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">מספר טלפון</label>
            <input
              id="phone"
              type="tel"
              placeholder="050-0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
            />
          </div>

          {!otpSent ? (
            <button
              type="button"
              disabled
              onClick={() => setOtpSent(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            >
              שלח קוד אימות
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp" className="text-sm font-medium text-foreground">קוד אימות</label>
                <input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40 tracking-widest text-center text-lg"
                />
              </div>
              <Link
                href="/passenger/profile"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white text-center hover:bg-primary/90"
              >
                כניסה
              </Link>
            </>
          )}
        </div>
      )}

      {method === "password" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">אימייל</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">סיסמה</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-input px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus:ring-1 focus-visible:ring-ring/40"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/5 border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <button
            type="button"
            disabled={!email || !password || loading}
            onClick={handlePasswordLogin}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              email && password && !loading ? "bg-primary hover:bg-primary/90" : "bg-primary opacity-50 cursor-not-allowed"
            }`}
          >
            {loading ? "נכנס..." : "כניסה"}
          </button>
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground">
        עדיין לא רשום?{" "}
        <Link href="/passenger/register" className="text-primary hover:underline">
          הרשמה
        </Link>
      </p>
    </div>
  );
}
