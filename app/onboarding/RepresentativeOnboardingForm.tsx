"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { completeOnboarding } from "@/app/actions/auth";
import {
  defaultRepOnboardingFields,
  submitRepOnboarding,
  type RepOnboardingErrors,
  type RepOnboardingFields,
} from "@/app/onboarding/rep-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

const TEXT = {
  title: "רישום נציג",
  description: "השלימו את פרטי הנציג כדי להשלים את ההרשמה.",
  fullName: "שם מלא",
  phone: "טלפון",
  nationalId: "תעודת זהות",
  password: "סיסמה",
  passwordHint: "לפחות 8 תווים",
  submit: "שליחה לאישור",
  submitting: "שולח...",
  expiredSession: "פג תוקף ההזמנה. פתחו שוב את קישור ההזמנה.",
} as const;

function FieldError({ errors, name }: { errors: RepOnboardingErrors; name: keyof RepOnboardingErrors }) {
  const message = errors[name];
  if (!message) return null;
  return (
    <p className="mt-1 text-right text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function RepresentativeOnboardingForm() {
  const [fields, setFields] = useState<RepOnboardingFields>(defaultRepOnboardingFields);
  const [errors, setErrors] = useState<RepOnboardingErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof RepOnboardingFields>(name: K, value: RepOnboardingFields[K]) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setIsSubmitting(false);
      setErrors({ form: TEXT.expiredSession });
      return;
    }

    const result = await submitRepOnboarding({
      fields,
      accessToken,
      complete: completeOnboarding,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    window.location.assign("/onboarding/pending");
  }

  return (
    <Card className="mt-6 rounded-lg text-right" dir="rtl">
      <CardHeader>
        <CardTitle>{TEXT.title}</CardTitle>
        <CardDescription>{TEXT.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5 text-right"
          data-testid="rep-onboarding-form"
          onSubmit={onSubmit}
          noValidate
        >
          {errors.form && (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-right text-sm text-destructive"
              role="alert"
            >
              {errors.form}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="rep-full-name" className="text-right">
                {TEXT.fullName}
              </FieldLabel>
              <Input
                id="rep-full-name"
                autoComplete="name"
                className="text-right"
                value={fields.fullName}
                aria-invalid={Boolean(errors.fullName)}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
              <FieldError errors={errors} name="fullName" />
            </div>

            <div>
              <FieldLabel htmlFor="rep-phone" className="text-right">
                {TEXT.phone}
              </FieldLabel>
              <Input
                id="rep-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+972501234567"
                className="text-right"
                value={fields.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(e) => updateField("phone", e.target.value)}
              />
              <FieldError errors={errors} name="phone" />
            </div>

            <div>
              <FieldLabel htmlFor="rep-national-id" className="text-right">
                {TEXT.nationalId}
              </FieldLabel>
              <Input
                id="rep-national-id"
                inputMode="numeric"
                autoComplete="off"
                className="text-right"
                value={fields.nationalId}
                aria-invalid={Boolean(errors.nationalId)}
                onChange={(e) => updateField("nationalId", e.target.value)}
              />
              <FieldError errors={errors} name="nationalId" />
            </div>

            <div>
              <FieldLabel htmlFor="rep-password" className="text-right">
                {TEXT.password}
              </FieldLabel>
              <Input
                id="rep-password"
                type="password"
                autoComplete="new-password"
                className="text-right"
                value={fields.password}
                aria-invalid={Boolean(errors.password)}
                onChange={(e) => updateField("password", e.target.value)}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{TEXT.passwordHint}</p>
              <FieldError errors={errors} name="password" />
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? TEXT.submitting : TEXT.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
