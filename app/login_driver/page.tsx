"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverAuthShell } from "@/components/driver/DriverAuthShell";
import { loginDriver } from "@/lib/driver/api";
import { storeDriverSession } from "@/lib/driver/session";
import type { DriverApiError } from "@/lib/driver/types";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";

export default function LoginDriverPage() {
  const router = useRouter();
  const { t } = useDriverI18n();
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
    <DriverAuthShell title={t("loginTitle")} body={t("loginBody")}>
      {error ? (
        <div className="mb-5">
          <DriverNotice title={t("loginFailed")} kind="error">
            {error}
          </DriverNotice>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="driver-login-form">
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
          {t("password")}
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </FieldLabel>
        <Button type="submit" disabled={isPending} size="lg" className="w-full">
          {isPending ? t("loginPending") : t("login")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">{t("inviteOnlyAccount")}</p>
    </DriverAuthShell>
  );
}
