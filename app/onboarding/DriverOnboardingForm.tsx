"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Upload } from "lucide-react";
import { completeOnboarding } from "@/app/actions/auth";
import {
  ALLOWED_LICENSE_PHOTO_TYPES,
  defaultDriverOnboardingFields,
  LICENSE_PHOTO_BUCKET,
  submitDriverOnboarding,
  type DriverOnboardingErrors,
  type DriverOnboardingFields,
} from "@/app/onboarding/driver-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

const TEXT = {
  expiredSession: "\u05e4\u05d2 \u05ea\u05d5\u05e7\u05e3 \u05d4\u05d4\u05d6\u05de\u05e0\u05d4. \u05e4\u05ea\u05d7\u05d5 \u05e9\u05d5\u05d1 \u05d0\u05ea \u05e7\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d4\u05d6\u05de\u05e0\u05d4.",
  title: "\u05e8\u05d9\u05e9\u05d5\u05dd \u05e0\u05d4\u05d2",
  description: "\u05d4\u05e9\u05dc\u05d9\u05de\u05d5 \u05d0\u05ea \u05e4\u05e8\u05d8\u05d9 \u05d4\u05e0\u05d4\u05d2 \u05db\u05d3\u05d9 \u05e9\u05d4\u05e6\u05d5\u05d5\u05ea \u05d9\u05d5\u05db\u05dc \u05dc\u05d1\u05d3\u05d5\u05e7 \u05d5\u05dc\u05d0\u05e9\u05e8 \u05d0\u05ea \u05d4\u05d7\u05e9\u05d1\u05d5\u05df.",
  fullName: "\u05e9\u05dd \u05de\u05dc\u05d0",
  phone: "\u05d8\u05dc\u05e4\u05d5\u05df",
  nationalId: "\u05ea\u05e2\u05d5\u05d3\u05ea \u05d6\u05d4\u05d5\u05ea",
  password: "\u05e1\u05d9\u05e1\u05de\u05d4",
  location: "\u05de\u05d9\u05e7\u05d5\u05dd \u05d1\u05d9\u05e9\u05e8\u05d0\u05dc",
  birthYear: "\u05e9\u05e0\u05ea \u05dc\u05d9\u05d3\u05d4",
  gender: "\u05de\u05d2\u05d3\u05e8",
  select: "\u05d1\u05d7\u05d9\u05e8\u05d4",
  female: "\u05d0\u05d9\u05e9\u05d4",
  male: "\u05d2\u05d1\u05e8",
  other: "\u05d0\u05d7\u05e8",
  preferNotToSay: "\u05de\u05e2\u05d3\u05d9\u05e3/\u05d4 \u05dc\u05d0 \u05dc\u05e6\u05d9\u05d9\u05df",
  licenseType: "\u05e1\u05d5\u05d2 \u05e8\u05d9\u05e9\u05d9\u05d5\u05df",
  licenseIssueYear: "\u05e9\u05e0\u05ea \u05d4\u05d5\u05e6\u05d0\u05ea \u05e8\u05d9\u05e9\u05d9\u05d5\u05df",
  licensePhoto: "\u05e6\u05d9\u05dc\u05d5\u05dd \u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05e0\u05d4\u05d9\u05d2\u05d4",
  uploadPrompt: "\u05d4\u05e2\u05dc\u05d5 \u05ea\u05de\u05d5\u05e0\u05ea JPG, PNG \u05d0\u05d5 WebP",
  fileSize: "\u05d2\u05d5\u05d3\u05dc \u05e7\u05d5\u05d1\u05e5 \u05de\u05e8\u05d1\u05d9: 5MB.",
  chooseFile: "\u05d1\u05d7\u05d9\u05e8\u05ea \u05e7\u05d5\u05d1\u05e5",
  criminalConsent: "\u05d0\u05e0\u05d9 \u05de\u05e1\u05db\u05d9\u05dd/\u05d4 \u05dc\u05d1\u05d3\u05d9\u05e7\u05d4 \u05d4\u05e0\u05d3\u05e8\u05e9\u05ea \u05e9\u05dc \u05e8\u05d9\u05e9\u05d5\u05dd \u05e4\u05dc\u05d9\u05dc\u05d9 \u05dc\u05e6\u05d5\u05e8\u05da \u05d0\u05d9\u05e9\u05d5\u05e8 \u05e0\u05d4\u05d2.",
  vehicleConfirmation: "\u05d0\u05e0\u05d9 \u05de\u05d0\u05e9\u05e8/\u05ea \u05e9\u05d9\u05e9 \u05d1\u05e8\u05e9\u05d5\u05ea\u05d9 \u05e8\u05db\u05d1 \u05d0\u05de\u05d1\u05d5\u05dc\u05d8\u05d5\u05e8\u05d9 \u05d4\u05de\u05ea\u05d0\u05d9\u05dd \u05dc\u05e0\u05e1\u05d9\u05e2\u05d5\u05ea \u05d4\u05ea\u05e0\u05d3\u05d1\u05d5\u05ea\u05d9\u05d5\u05ea.",
  submitting: "\u05e9\u05d5\u05dc\u05d7...",
  submit: "\u05e9\u05dc\u05d9\u05d7\u05d4 \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8",
} as const;

function fieldError(errors: DriverOnboardingErrors, name: keyof DriverOnboardingErrors) {
  const message = errors[name];
  if (!message) return null;
  return (
    <p className="mt-1 text-right text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function DriverOnboardingForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<DriverOnboardingFields>(defaultDriverOnboardingFields);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<DriverOnboardingErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof DriverOnboardingFields>(name: K, value: DriverOnboardingFields[K]) {
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

    const result = await submitDriverOnboarding({
      fields,
      licensePhoto,
      accessToken,
      uploader: supabase.storage.from(LICENSE_PHOTO_BUCKET),
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
        <CardDescription>
          {TEXT.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 text-right" data-testid="driver-onboarding-form" onSubmit={onSubmit} noValidate>
          {errors.form && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-right text-sm text-destructive" role="alert">
              {errors.form}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="driver-full-name" className="text-right">{TEXT.fullName}</FieldLabel>
              <Input
                id="driver-full-name"
                autoComplete="name"
                className="text-right"
                value={fields.fullName}
                aria-invalid={Boolean(errors.fullName)}
                onChange={(event) => updateField("fullName", event.target.value)}
              />
              {fieldError(errors, "fullName")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-phone" className="text-right">{TEXT.phone}</FieldLabel>
              <Input
                id="driver-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+972501234567"
                className="text-right"
                value={fields.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(event) => updateField("phone", event.target.value)}
              />
              {fieldError(errors, "phone")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-national-id" className="text-right">{TEXT.nationalId}</FieldLabel>
              <Input
                id="driver-national-id"
                inputMode="numeric"
                autoComplete="off"
                className="text-right"
                value={fields.nationalId}
                aria-invalid={Boolean(errors.nationalId)}
                onChange={(event) => updateField("nationalId", event.target.value)}
              />
              {fieldError(errors, "nationalId")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-password" className="text-right">{TEXT.password}</FieldLabel>
              <Input
                id="driver-password"
                type="password"
                autoComplete="new-password"
                className="text-right"
                value={fields.password}
                aria-invalid={Boolean(errors.password)}
                onChange={(event) => updateField("password", event.target.value)}
              />
              {fieldError(errors, "password")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-location" className="text-right">{TEXT.location}</FieldLabel>
              <Input
                id="driver-location"
                autoComplete="address-level2"
                className="text-right"
                value={fields.location}
                aria-invalid={Boolean(errors.location)}
                onChange={(event) => updateField("location", event.target.value)}
              />
              {fieldError(errors, "location")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-birth-year" className="text-right">{TEXT.birthYear}</FieldLabel>
              <Input
                id="driver-birth-year"
                type="number"
                inputMode="numeric"
                min={1920}
                max={new Date().getFullYear() - 17}
                className="text-right"
                value={fields.birthYear}
                aria-invalid={Boolean(errors.birthYear)}
                onChange={(event) => updateField("birthYear", event.target.value)}
              />
              {fieldError(errors, "birthYear")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-gender" className="text-right">{TEXT.gender}</FieldLabel>
              <select
                id="driver-gender"
                className="border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-right text-sm outline-none focus-visible:ring-[3px]"
                value={fields.gender}
                aria-invalid={Boolean(errors.gender)}
                onChange={(event) => updateField("gender", event.target.value)}
              >
                <option value="">{TEXT.select}</option>
                <option value="female">{TEXT.female}</option>
                <option value="male">{TEXT.male}</option>
                <option value="other">{TEXT.other}</option>
                <option value="prefer_not_to_say">{TEXT.preferNotToSay}</option>
              </select>
              {fieldError(errors, "gender")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-license-type" className="text-right">{TEXT.licenseType}</FieldLabel>
              <Input
                id="driver-license-type"
                className="text-right"
                value={fields.licenseType}
                aria-invalid={Boolean(errors.licenseType)}
                onChange={(event) => updateField("licenseType", event.target.value)}
              />
              {fieldError(errors, "licenseType")}
            </div>

            <div>
              <FieldLabel htmlFor="driver-license-issue-year" className="text-right">{TEXT.licenseIssueYear}</FieldLabel>
              <Input
                id="driver-license-issue-year"
                type="number"
                inputMode="numeric"
                min={1950}
                max={new Date().getFullYear()}
                className="text-right"
                value={fields.licenseIssueYear}
                aria-invalid={Boolean(errors.licenseIssueYear)}
                onChange={(event) => updateField("licenseIssueYear", event.target.value)}
              />
              {fieldError(errors, "licenseIssueYear")}
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="driver-license-photo" className="text-right">{TEXT.licensePhoto}</FieldLabel>
              <div className="mt-1 flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-right text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {licensePhoto ? licensePhoto.name : TEXT.uploadPrompt}
                  </p>
                  <p>{TEXT.fileSize}</p>
                </div>
                <input
                  ref={fileRef}
                  id="driver-license-photo"
                  className="sr-only"
                  type="file"
                  accept={ALLOWED_LICENSE_PHOTO_TYPES.join(",")}
                  onChange={(event) => {
                    setLicensePhoto(event.target.files?.[0] ?? null);
                    setErrors((current) => ({ ...current, licensePhoto: undefined, form: undefined }));
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload aria-hidden="true" />
                  {TEXT.chooseFile}
                </Button>
              </div>
              {fieldError(errors, "licensePhoto")}
            </div>
          </div>

          <div className="grid gap-3">
            <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={fields.consentCriminalRecord}
                onChange={(event) => updateField("consentCriminalRecord", event.target.checked)}
              />
              <span className="text-right">{TEXT.criminalConsent}</span>
            </label>
            {fieldError(errors, "consentCriminalRecord")}

            <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={fields.ownsVehicleAmbulatory}
                onChange={(event) => updateField("ownsVehicleAmbulatory", event.target.checked)}
              />
              <span className="text-right">{TEXT.vehicleConfirmation}</span>
            </label>
            {fieldError(errors, "ownsVehicleAmbulatory")}
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? TEXT.submitting : TEXT.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
