import type { ActionResponse } from "@/app/actions/auth";

export const LICENSE_PHOTO_BUCKET = "license-photos";
export const MAX_LICENSE_PHOTO_SIZE = 5 * 1024 * 1024;
export const ALLOWED_LICENSE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type DriverOnboardingFields = {
  fullName: string;
  phone: string;
  nationalId: string;
  password: string;
  location: string;
  birthYear: string;
  gender: string;
  licenseType: string;
  licenseIssueYear: string;
  consentCriminalRecord: boolean;
  ownsVehicleAmbulatory: boolean;
};

export type DriverOnboardingErrors = Partial<Record<keyof DriverOnboardingFields | "licensePhoto" | "form", string>>;

export type DriverOnboardingPayload = {
  fullName: string;
  phone: string;
  nationalId: string;
  password: string;
  location: string;
  birthYear: number;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  licenseType: string;
  licenseIssueYear: number;
  licensePhotoPath: string;
  consentCriminalRecord: boolean;
  ownsVehicleAmbulatory: boolean;
};

export type UploadUrlResponse = {
  uploadUrl: string;
  path: string;
  token: string;
};

export type LicensePhotoUploader = {
  uploadToSignedUrl: (
    path: string,
    token: string,
    file: File,
    options?: { contentType?: string; upsert?: boolean },
  ) => Promise<{ error: { message?: string } | null }>;
};

const PHONE_REGEX = /^\+972\d{8,9}$/;
const VALID_GENDERS = new Set(["male", "female", "other", "prefer_not_to_say"]);

export const DRIVER_ONBOARDING_MESSAGES = {
  licensePhotoRequired: "\u05e0\u05d3\u05e8\u05e9 \u05e6\u05d9\u05dc\u05d5\u05dd \u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05e0\u05d4\u05d9\u05d2\u05d4.",
  licensePhotoType: "\u05e6\u05d9\u05dc\u05d5\u05dd \u05d4\u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05d7\u05d9\u05d9\u05d1 \u05dc\u05d4\u05d9\u05d5\u05ea \u05ea\u05de\u05d5\u05e0\u05ea JPG, PNG \u05d0\u05d5 WebP.",
  licensePhotoSize: "\u05e6\u05d9\u05dc\u05d5\u05dd \u05d4\u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05d7\u05d9\u05d9\u05d1 \u05dc\u05d4\u05d9\u05d5\u05ea \u05d1\u05d2\u05d5\u05d3\u05dc 5MB \u05d0\u05d5 \u05e4\u05d7\u05d5\u05ea.",
  fullNameRequired: "\u05e9\u05dd \u05de\u05dc\u05d0 \u05d4\u05d5\u05d0 \u05e9\u05d3\u05d4 \u05d7\u05d5\u05d1\u05d4.",
  phoneInvalid: "\u05d9\u05e9 \u05dc\u05d4\u05d6\u05d9\u05df \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df \u05d9\u05e9\u05e8\u05d0\u05dc\u05d9 \u05d1\u05e4\u05d5\u05e8\u05de\u05d8 +972.",
  nationalIdInvalid: "\u05d9\u05e9 \u05dc\u05d4\u05d6\u05d9\u05df \u05de\u05e1\u05e4\u05e8 \u05ea\u05e2\u05d5\u05d3\u05ea \u05d6\u05d4\u05d5\u05ea \u05ea\u05e7\u05d9\u05df.",
  passwordInvalid: "\u05d4\u05e1\u05d9\u05e1\u05de\u05d4 \u05d7\u05d9\u05d9\u05d1\u05ea \u05dc\u05d4\u05db\u05d9\u05dc \u05dc\u05e4\u05d7\u05d5\u05ea 8 \u05ea\u05d5\u05d5\u05d9\u05dd.",
  locationRequired: "\u05de\u05d9\u05e7\u05d5\u05dd \u05d4\u05d5\u05d0 \u05e9\u05d3\u05d4 \u05d7\u05d5\u05d1\u05d4.",
  birthYearInvalid: (minimum: number, maximum: number) =>
    `\u05e9\u05e0\u05ea \u05d4\u05dc\u05d9\u05d3\u05d4 \u05d7\u05d9\u05d9\u05d1\u05ea \u05dc\u05d4\u05d9\u05d5\u05ea \u05d1\u05d9\u05df ${minimum} \u05dc-${maximum}.`,
  genderRequired: "\u05d9\u05e9 \u05dc\u05d1\u05d7\u05d5\u05e8 \u05de\u05d2\u05d3\u05e8.",
  licenseTypeRequired: "\u05e1\u05d5\u05d2 \u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05d4\u05d5\u05d0 \u05e9\u05d3\u05d4 \u05d7\u05d5\u05d1\u05d4.",
  licenseIssueYearInvalid: (currentYear: number) =>
    `\u05e9\u05e0\u05ea \u05d4\u05d5\u05e6\u05d0\u05ea \u05d4\u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05d7\u05d9\u05d9\u05d1\u05ea \u05dc\u05d4\u05d9\u05d5\u05ea \u05d1\u05d9\u05df 1950 \u05dc-${currentYear}.`,
  criminalConsentRequired: "\u05e0\u05d3\u05e8\u05e9\u05ea \u05d4\u05e1\u05db\u05de\u05d4 \u05dc\u05d1\u05d3\u05d9\u05e7\u05ea \u05e8\u05d9\u05e9\u05d5\u05dd \u05e4\u05dc\u05d9\u05dc\u05d9.",
  vehicleConfirmationRequired: "\u05d9\u05e9 \u05dc\u05d0\u05e9\u05e8 \u05e9\u05d9\u05e9 \u05d1\u05e8\u05e9\u05d5\u05ea\u05da \u05e8\u05db\u05d1 \u05d0\u05de\u05d1\u05d5\u05dc\u05d8\u05d5\u05e8\u05d9.",
  uploadPrepareFailed: "\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d4\u05db\u05d9\u05df \u05d0\u05ea \u05d4\u05e2\u05dc\u05d0\u05ea \u05e6\u05d9\u05dc\u05d5\u05dd \u05d4\u05e8\u05d9\u05e9\u05d9\u05d5\u05df.",
  uploadFailed: "\u05d4\u05e2\u05dc\u05d0\u05ea \u05e6\u05d9\u05dc\u05d5\u05dd \u05d4\u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05e0\u05db\u05e9\u05dc\u05d4.",
  submitFailed: "\u05e9\u05dc\u05d9\u05d7\u05ea \u05d8\u05d5\u05e4\u05e1 \u05d4\u05d4\u05e8\u05e9\u05de\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4.",
} as const;

export const defaultDriverOnboardingFields: DriverOnboardingFields = {
  fullName: "",
  phone: "",
  nationalId: "",
  password: "",
  location: "",
  birthYear: "",
  gender: "",
  licenseType: "",
  licenseIssueYear: "",
  consentCriminalRecord: false,
  ownsVehicleAmbulatory: false,
};

export function isValidIsraeliNationalId(value: string): boolean {
  const id = value.trim();
  if (!/^\d{5,9}$/.test(id)) return false;

  const padded = id.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let digit = Number(padded[i]) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }

  return sum % 10 === 0;
}

export function validateLicensePhoto(file: File | null): string | null {
  if (!file) return DRIVER_ONBOARDING_MESSAGES.licensePhotoRequired;
  if (!ALLOWED_LICENSE_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_LICENSE_PHOTO_TYPES)[number])) {
    return DRIVER_ONBOARDING_MESSAGES.licensePhotoType;
  }
  if (file.size > MAX_LICENSE_PHOTO_SIZE) {
    return DRIVER_ONBOARDING_MESSAGES.licensePhotoSize;
  }
  return null;
}

export function validateDriverOnboardingFields(
  fields: DriverOnboardingFields,
  licensePhoto: File | null,
  now = new Date(),
): DriverOnboardingErrors {
  const errors: DriverOnboardingErrors = {};
  const currentYear = now.getFullYear();
  const minimumBirthYear = 1920;
  const maximumBirthYear = currentYear - 17;
  const birthYear = Number(fields.birthYear);
  const licenseIssueYear = Number(fields.licenseIssueYear);

  if (!fields.fullName.trim()) errors.fullName = DRIVER_ONBOARDING_MESSAGES.fullNameRequired;
  if (!PHONE_REGEX.test(fields.phone.trim())) errors.phone = DRIVER_ONBOARDING_MESSAGES.phoneInvalid;
  if (!isValidIsraeliNationalId(fields.nationalId)) errors.nationalId = DRIVER_ONBOARDING_MESSAGES.nationalIdInvalid;
  if (fields.password.length < 8) errors.password = DRIVER_ONBOARDING_MESSAGES.passwordInvalid;
  if (!fields.location.trim()) errors.location = DRIVER_ONBOARDING_MESSAGES.locationRequired;
  if (!Number.isInteger(birthYear) || birthYear < minimumBirthYear || birthYear > maximumBirthYear) {
    errors.birthYear = DRIVER_ONBOARDING_MESSAGES.birthYearInvalid(minimumBirthYear, maximumBirthYear);
  }
  if (!VALID_GENDERS.has(fields.gender)) errors.gender = DRIVER_ONBOARDING_MESSAGES.genderRequired;
  if (!fields.licenseType.trim()) errors.licenseType = DRIVER_ONBOARDING_MESSAGES.licenseTypeRequired;
  if (!Number.isInteger(licenseIssueYear) || licenseIssueYear < 1950 || licenseIssueYear > currentYear) {
    errors.licenseIssueYear = DRIVER_ONBOARDING_MESSAGES.licenseIssueYearInvalid(currentYear);
  }
  if (!fields.consentCriminalRecord) {
    errors.consentCriminalRecord = DRIVER_ONBOARDING_MESSAGES.criminalConsentRequired;
  }
  if (!fields.ownsVehicleAmbulatory) {
    errors.ownsVehicleAmbulatory = DRIVER_ONBOARDING_MESSAGES.vehicleConfirmationRequired;
  }

  const photoError = validateLicensePhoto(licensePhoto);
  if (photoError) errors.licensePhoto = photoError;

  return errors;
}

export function hasDriverOnboardingErrors(errors: DriverOnboardingErrors): boolean {
  return Object.keys(errors).length > 0;
}

export async function uploadLicensePhoto({
  accessToken,
  file,
  uploader,
  fetcher = fetch,
}: {
  accessToken: string;
  file: File;
  uploader: LicensePhotoUploader;
  fetcher?: typeof fetch;
}): Promise<string> {
  const response = await fetcher("/api/storage/license-photo-url", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });

  const body = (await response.json().catch(() => null)) as Partial<UploadUrlResponse & { error: string }> | null;
  if (!response.ok || !body?.path || !body.token) {
    throw new Error(body?.error ?? DRIVER_ONBOARDING_MESSAGES.uploadPrepareFailed);
  }

  const uploaded = await uploader.uploadToSignedUrl(body.path, body.token, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploaded.error) {
    throw new Error(uploaded.error.message ?? DRIVER_ONBOARDING_MESSAGES.uploadFailed);
  }

  return body.path;
}

export async function submitDriverOnboarding({
  fields,
  licensePhoto,
  accessToken,
  uploader,
  complete,
  fetcher,
}: {
  fields: DriverOnboardingFields;
  licensePhoto: File | null;
  accessToken: string;
  uploader: LicensePhotoUploader;
  complete: (token: string, payload: DriverOnboardingPayload) => Promise<ActionResponse>;
  fetcher?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; errors: DriverOnboardingErrors }> {
  const errors = validateDriverOnboardingFields(fields, licensePhoto);
  if (hasDriverOnboardingErrors(errors)) return { ok: false, errors };

  if (!licensePhoto) {
    return { ok: false, errors: { licensePhoto: DRIVER_ONBOARDING_MESSAGES.licensePhotoRequired } };
  }

  try {
    const licensePhotoPath = await uploadLicensePhoto({
      accessToken,
      file: licensePhoto,
      uploader,
      fetcher,
    });

    const result = await complete(accessToken, {
      fullName: fields.fullName.trim(),
      phone: fields.phone.trim(),
      nationalId: fields.nationalId.trim(),
      password: fields.password,
      location: fields.location.trim(),
      birthYear: Number(fields.birthYear),
      gender: fields.gender as DriverOnboardingPayload["gender"],
      licenseType: fields.licenseType.trim(),
      licenseIssueYear: Number(fields.licenseIssueYear),
      licensePhotoPath,
      consentCriminalRecord: fields.consentCriminalRecord,
      ownsVehicleAmbulatory: fields.ownsVehicleAmbulatory,
    });

    if (!result.success) {
      return { ok: false, errors: { form: result.message ?? result.error ?? DRIVER_ONBOARDING_MESSAGES.submitFailed } };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errors: { form: error instanceof Error ? error.message : DRIVER_ONBOARDING_MESSAGES.submitFailed },
    };
  }
}
