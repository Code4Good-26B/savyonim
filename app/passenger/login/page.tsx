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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-6">
      <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMethod("otp")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            method === "otp" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          קוד לנייד
        </button>
        <button
          type="button"
          onClick={() => setMethod("password")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            method === "password" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          שם משתמש וסיסמה
        </button>
      </div>

      {method === "otp" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">מספר טלפון</label>
            <input
              id="phone"
              type="tel"
              placeholder="050-0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {!otpSent ? (
            <button
              type="button"
              disabled
              onClick={() => setOtpSent(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            >
              שלח קוד אימות
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp" className="text-sm font-medium text-gray-700">קוד אימות</label>
                <input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tracking-widest text-center text-lg"
                />
              </div>
              <Link
                href="/passenger/profile"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white text-center hover:bg-blue-700"
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
            <label htmlFor="email" className="text-sm font-medium text-gray-700">אימייל</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">סיסמה</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button
            type="button"
            disabled={!email || !password || loading}
            onClick={handlePasswordLogin}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              email && password && !loading ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 opacity-50 cursor-not-allowed"
            }`}
          >
            {loading ? "נכנס..." : "כניסה"}
          </button>
        </div>
      )}
      <p className="text-center text-sm text-gray-500">
        עדיין לא רשום?{" "}
        <Link href="/passenger/register" className="text-blue-600 hover:underline">
          הרשמה
        </Link>
      </p>
    </div>
  );
}
