import type { ActionResponse } from "@/app/actions/auth";
import { isValidIsraeliNationalId } from "./driver-form";

export type RepOnboardingFields = {
  fullName: string;
  phone: string;
  nationalId: string;
  password: string;
};

export type RepOnboardingErrors = Partial<Record<keyof RepOnboardingFields | "form", string>>;

export const defaultRepOnboardingFields: RepOnboardingFields = {
  fullName: "",
  phone: "",
  nationalId: "",
  password: "",
};

const PHONE_REGEX = /^\+972\d{8,9}$/;

export const REP_ONBOARDING_MESSAGES = {
  fullNameRequired: "שם מלא הוא שדה חובה.",
  phoneInvalid: "יש להזין מספר טלפון ישראלי בפורמט +972.",
  nationalIdInvalid: "יש להזין מספר תעודת זהות תקין.",
  passwordInvalid: "הסיסמה חייבת להכיל לפחות 8 תווים.",
  expiredSession: "פג תוקף ההזמנה. פתחו שוב את קישור ההזמנה.",
  submitFailed: "שליחת טופס ההרשמה נכשלה.",
} as const;

export function validateRepOnboardingFields(fields: RepOnboardingFields): RepOnboardingErrors {
  const errors: RepOnboardingErrors = {};

  if (!fields.fullName.trim()) {
    errors.fullName = REP_ONBOARDING_MESSAGES.fullNameRequired;
  }
  if (!PHONE_REGEX.test(fields.phone.trim())) {
    errors.phone = REP_ONBOARDING_MESSAGES.phoneInvalid;
  }
  if (!isValidIsraeliNationalId(fields.nationalId)) {
    errors.nationalId = REP_ONBOARDING_MESSAGES.nationalIdInvalid;
  }
  if (fields.password.length < 8) {
    errors.password = REP_ONBOARDING_MESSAGES.passwordInvalid;
  }

  return errors;
}

export function hasRepOnboardingErrors(errors: RepOnboardingErrors): boolean {
  return Object.keys(errors).length > 0;
}

export async function submitRepOnboarding({
  fields,
  accessToken,
  complete,
}: {
  fields: RepOnboardingFields;
  accessToken: string;
  complete: (token: string, payload: { fullName: string; phone: string; nationalId: string; password: string }) => Promise<ActionResponse>;
}): Promise<{ ok: true } | { ok: false; errors: RepOnboardingErrors }> {
  const errors = validateRepOnboardingFields(fields);
  if (hasRepOnboardingErrors(errors)) return { ok: false, errors };

  try {
    const result = await complete(accessToken, {
      fullName: fields.fullName.trim(),
      phone: fields.phone.trim(),
      nationalId: fields.nationalId.trim(),
      password: fields.password,
    });

    if (!result.success) {
      return {
        ok: false,
        errors: { form: result.message ?? result.error ?? REP_ONBOARDING_MESSAGES.submitFailed },
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errors: { form: error instanceof Error ? error.message : REP_ONBOARDING_MESSAGES.submitFailed },
    };
  }
}
