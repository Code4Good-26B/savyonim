"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { registerDriver } from "@/lib/driver/api";
import { storeDriverSession } from "@/lib/driver/session";
import type { DriverApiError } from "@/lib/driver/types";
import { DriverNotice } from "@/components/driver/DriverNotice";

export default function RegisterDriverPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceZoneId, setServiceZoneId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const session = await registerDriver({
        fullName,
        email,
        phone,
        password,
        serviceZoneId: serviceZoneId || undefined,
      });
      storeDriverSession(session);
      router.replace("/driver/dashboard");
    } catch (caught) {
      const apiError = caught as DriverApiError;
      setError(apiError.detail ?? "Could not register this driver.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Savionim driver</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Register driver</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Creates a local driver account and profile. Leave service zone empty if the team has not assigned one yet.
        </p>

        {error ? (
          <div className="mt-4">
            <DriverNotice title="Registration failed" kind="error">{error}</DriverNotice>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Service zone ID
            <input
              value={serviceZoneId}
              onChange={(event) => setServiceZoneId(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              placeholder="Optional service zone UUID"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              minLength={8}
              required
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 w-full rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-blue-300"
          >
            {isPending ? "Creating driver..." : "Create driver account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-blue-700">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
