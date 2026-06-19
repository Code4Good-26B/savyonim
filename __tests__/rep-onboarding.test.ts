import { describe, expect, it, vi } from "vitest";
import {
  REP_ONBOARDING_MESSAGES,
  defaultRepOnboardingFields,
  submitRepOnboarding,
  validateRepOnboardingFields,
  type RepOnboardingFields,
} from "@/app/onboarding/rep-form";

function validFields(overrides: Partial<RepOnboardingFields> = {}): RepOnboardingFields {
  return {
    ...defaultRepOnboardingFields,
    fullName: "Noa Levi",
    phone: "+972501234567",
    nationalId: "123456782",
    password: "SecurePass1!",
    ...overrides,
  };
}

describe("representative onboarding validation", () => {
  it("passes with all valid fields", () => {
    const errors = validateRepOnboardingFields(validFields());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("requires a non-empty full name", () => {
    const errors = validateRepOnboardingFields(validFields({ fullName: "" }));
    expect(errors.fullName).toBe(REP_ONBOARDING_MESSAGES.fullNameRequired);
  });

  it("requires full name to not be only whitespace", () => {
    const errors = validateRepOnboardingFields(validFields({ fullName: "   " }));
    expect(errors.fullName).toBe(REP_ONBOARDING_MESSAGES.fullNameRequired);
  });

  it("rejects phone numbers not in +972 format", () => {
    const badPhones = ["0501234567", "972501234567", "+1-800-555-1234", "", "abc"];
    for (const phone of badPhones) {
      const errors = validateRepOnboardingFields(validFields({ phone }));
      expect(errors.phone, `phone: "${phone}"`).toBe(REP_ONBOARDING_MESSAGES.phoneInvalid);
    }
  });

  it("accepts valid +972 phone numbers", () => {
    const goodPhones = ["+972501234567", "+97221234567", "+972598765432"];
    for (const phone of goodPhones) {
      const errors = validateRepOnboardingFields(validFields({ phone }));
      expect(errors.phone, `phone: "${phone}"`).toBeUndefined();
    }
  });

  it("rejects invalid Israeli national IDs", () => {
    const badIds = ["123456789", "111111111", "abc", ""];
    for (const nationalId of badIds) {
      const errors = validateRepOnboardingFields(validFields({ nationalId }));
      expect(errors.nationalId, `id: "${nationalId}"`).toBe(REP_ONBOARDING_MESSAGES.nationalIdInvalid);
    }
  });

  it("accepts valid Israeli national IDs with checksum", () => {
    const goodIds = ["123456782", "039337423"];
    for (const nationalId of goodIds) {
      const errors = validateRepOnboardingFields(validFields({ nationalId }));
      expect(errors.nationalId, `id: "${nationalId}"`).toBeUndefined();
    }
  });

  it("rejects passwords shorter than 8 characters", () => {
    const errors = validateRepOnboardingFields(validFields({ password: "Short1!" }));
    expect(errors.password).toBe(REP_ONBOARDING_MESSAGES.passwordInvalid);
  });

  it("accepts passwords of exactly 8 characters", () => {
    const errors = validateRepOnboardingFields(validFields({ password: "Abcdef1!" }));
    expect(errors.password).toBeUndefined();
  });

  it("returns all four errors when all fields are empty", () => {
    const errors = validateRepOnboardingFields(defaultRepOnboardingFields);
    expect(errors.fullName).toBe(REP_ONBOARDING_MESSAGES.fullNameRequired);
    expect(errors.phone).toBe(REP_ONBOARDING_MESSAGES.phoneInvalid);
    expect(errors.nationalId).toBe(REP_ONBOARDING_MESSAGES.nationalIdInvalid);
    expect(errors.password).toBe(REP_ONBOARDING_MESSAGES.passwordInvalid);
  });
});

describe("representative onboarding submission", () => {
  it("calls completeOnboarding with trimmed, valid fields", async () => {
    const complete = vi.fn().mockResolvedValue({ success: true });

    const result = await submitRepOnboarding({
      fields: validFields({ fullName: "  Noa Levi  ", phone: " +972501234567 " }),
      accessToken: "local-token",
      complete,
    });

    expect(result).toEqual({ ok: true });
    expect(complete).toHaveBeenCalledWith("local-token", {
      fullName: "Noa Levi",
      phone: "+972501234567",
      nationalId: "123456782",
      password: "SecurePass1!",
    });
  });

  it("blocks submission and returns field errors when validation fails", async () => {
    const complete = vi.fn();

    const result = await submitRepOnboarding({
      fields: validFields({ password: "short" }),
      accessToken: "local-token",
      complete,
    });

    expect(result).toEqual({
      ok: false,
      errors: { password: REP_ONBOARDING_MESSAGES.passwordInvalid },
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("surfaces server error message inline when completeOnboarding returns failure", async () => {
    const complete = vi.fn().mockResolvedValue({
      success: false,
      message: "לא נמצאה הזמנה ממתינה",
    });

    const result = await submitRepOnboarding({
      fields: validFields(),
      accessToken: "local-token",
      complete,
    });

    expect(result).toEqual({
      ok: false,
      errors: { form: "לא נמצאה הזמנה ממתינה" },
    });
  });

  it("falls back to generic error when server returns no message", async () => {
    const complete = vi.fn().mockResolvedValue({ success: false });

    const result = await submitRepOnboarding({
      fields: validFields(),
      accessToken: "local-token",
      complete,
    });

    expect(result).toEqual({
      ok: false,
      errors: { form: REP_ONBOARDING_MESSAGES.submitFailed },
    });
  });

  it("surfaces thrown errors as form-level errors", async () => {
    const complete = vi.fn().mockRejectedValue(new Error("network failure"));

    const result = await submitRepOnboarding({
      fields: validFields(),
      accessToken: "local-token",
      complete,
    });

    expect(result).toEqual({
      ok: false,
      errors: { form: "network failure" },
    });
  });
});
