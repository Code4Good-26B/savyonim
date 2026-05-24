"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";
import { loginDriver } from "@/lib/driver/api";
import { storeDriverSession } from "@/lib/driver/session";
import type { DriverApiError } from "@/lib/driver/types";
import { DriverNotice } from "@/components/driver/DriverNotice";

export default function LoginPage() {
  const router = useRouter();
  const { direction, t } = useDriverI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const session = await loginDriver(email, password);
      storeDriverSession(session);
      router.replace("/driver/dashboard");
    } catch (caught) {
      const apiError = caught as DriverApiError;
      setError(apiError.detail ?? "Could not log in.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8" dir={direction}>
      <div className="mx-auto mb-4 flex max-w-md justify-end">
        <LanguageSwitch />
      </div>
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">{t("landingEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("loginBody")}
        </p>

        {error ? (
          <div className="mt-4">
            <DriverNotice title={t("loginFailed")} kind="error">{error}</DriverNotice>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {t("email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 w-full rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-blue-300"
          >
            {isPending ? t("loginPending") : t("login")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          {t("needAccount")}{" "}
          <Link href="/register-driver" className="font-semibold text-blue-700">
            {t("signIn")}
          </Link>
        </p>
      </section>
    </main>
  );
}
