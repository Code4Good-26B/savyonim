"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverAuthShell } from "@/components/driver/DriverAuthShell";
import { registerDriver } from "@/lib/driver/api";
import { storeDriverSession } from "@/lib/driver/session";
import type { DriverApiError } from "@/lib/driver/types";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";

export default function RegisterDriverPage() {
  const router = useRouter();
  const { t } = useDriverI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    <DriverAuthShell title={t("registerTitle")} body={t("registerBody")}>
      {error ? (
        <div className="mb-5">
          <DriverNotice title={t("registrationFailed")} kind="error">{error}</DriverNotice>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel>
          {t("fullName")}
          <Input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
          />
        </FieldLabel>
        <FieldLabel>
          {t("email")}
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </FieldLabel>
        <FieldLabel>
          {t("phone")}
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
        </FieldLabel>
        <FieldLabel>
          {t("password")}
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </FieldLabel>
        <Button type="submit" disabled={isPending} size="lg" className="w-full">
          {isPending ? t("createDriverPending") : t("createDriverAccount")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {t("alreadyRegistered")}{" "}
        <Link href="/login" className="font-semibold text-blue-700 transition hover:text-blue-800">
          {t("login")}
        </Link>
      </p>
    </DriverAuthShell>
  );
}
