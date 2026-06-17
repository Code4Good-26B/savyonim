import { describe, expect, it, vi } from "vitest";
import {
  DRIVER_ONBOARDING_MESSAGES,
  defaultDriverOnboardingFields,
  isValidIsraeliNationalId,
  submitDriverOnboarding,
  uploadLicensePhoto,
  validateDriverOnboardingFields,
  validateLicensePhoto,
  type DriverOnboardingFields,
} from "@/app/onboarding/driver-form";

function imageFile(name = "license.png", type = "image/png", size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

function validFields(overrides: Partial<DriverOnboardingFields> = {}): DriverOnboardingFields {
  return {
    ...defaultDriverOnboardingFields,
    fullName: "Codex Driver",
    phone: "+972501234567",
    nationalId: "123456782",
    password: "LocalPass123!",
    location: "Haifa",
    birthYear: "1990",
    gender: "female",
    licenseType: "B",
    licenseIssueYear: "2015",
    consentCriminalRecord: true,
    ownsVehicleAmbulatory: true,
    ...overrides,
  };
}

describe("driver onboarding validation", () => {
  it("validates Israeli ID checksum", () => {
    expect(isValidIsraeliNationalId("123456782")).toBe(true);
    expect(isValidIsraeliNationalId("123456789")).toBe(false);
  });

  it("returns clear required field errors", () => {
    const errors = validateDriverOnboardingFields(defaultDriverOnboardingFields, null, new Date("2026-06-16"));

    expect(errors.fullName).toBe(DRIVER_ONBOARDING_MESSAGES.fullNameRequired);
    expect(errors.nationalId).toBe(DRIVER_ONBOARDING_MESSAGES.nationalIdInvalid);
    expect(errors.licensePhoto).toBe(DRIVER_ONBOARDING_MESSAGES.licensePhotoRequired);
    expect(errors.consentCriminalRecord).toBe(DRIVER_ONBOARDING_MESSAGES.criminalConsentRequired);
    expect(errors.ownsVehicleAmbulatory).toBe(DRIVER_ONBOARDING_MESSAGES.vehicleConfirmationRequired);
  });

  it("rejects unsupported or oversized license photos", () => {
    expect(validateLicensePhoto(imageFile("license.pdf", "application/pdf"))).toBe(
      DRIVER_ONBOARDING_MESSAGES.licensePhotoType,
    );
    expect(validateLicensePhoto(imageFile("large.png", "image/png", 6 * 1024 * 1024))).toBe(
      DRIVER_ONBOARDING_MESSAGES.licensePhotoSize,
    );
  });
});

describe("driver onboarding submission", () => {
  it("uploads the license photo through a signed Supabase upload URL", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        uploadUrl: "http://localhost/upload",
        path: "user-id/license.png",
        token: "signed-token",
      }),
    });
    const uploader = {
      uploadToSignedUrl: vi.fn().mockResolvedValue({ error: null }),
    };
    const file = imageFile();

    await expect(
      uploadLicensePhoto({
        accessToken: "local-token",
        file,
        uploader,
        fetcher,
      }),
    ).resolves.toBe("user-id/license.png");

    expect(fetcher).toHaveBeenCalledWith("/api/storage/license-photo-url", {
      method: "POST",
      headers: {
        Authorization: "Bearer local-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: "license.png", contentType: "image/png" }),
    });
    expect(uploader.uploadToSignedUrl).toHaveBeenCalledWith("user-id/license.png", "signed-token", file, {
      contentType: "image/png",
      upsert: false,
    });
  });

  it("submits valid driver onboarding data with the uploaded photo path", async () => {
    const complete = vi.fn().mockResolvedValue({ success: true });
    const uploader = {
      uploadToSignedUrl: vi.fn().mockResolvedValue({ error: null }),
    };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ path: "driver/license.webp", token: "token" }),
    });

    const result = await submitDriverOnboarding({
      fields: validFields(),
      licensePhoto: imageFile("license.webp", "image/webp"),
      accessToken: "local-token",
      uploader,
      complete,
      fetcher,
    });

    expect(result).toEqual({ ok: true });
    expect(complete).toHaveBeenCalledWith("local-token", {
      fullName: "Codex Driver",
      phone: "+972501234567",
      nationalId: "123456782",
      password: "LocalPass123!",
      location: "Haifa",
      birthYear: 1990,
      gender: "female",
      licenseType: "B",
      licenseIssueYear: 2015,
      licensePhotoPath: "driver/license.webp",
      consentCriminalRecord: true,
      ownsVehicleAmbulatory: true,
    });
  });

  it("surfaces upload and server failures without completing", async () => {
    const uploadFailure = await submitDriverOnboarding({
      fields: validFields(),
      licensePhoto: imageFile(),
      accessToken: "local-token",
      uploader: { uploadToSignedUrl: vi.fn() },
      complete: vi.fn(),
      fetcher: vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "\u05ea\u05de\u05d5\u05e0\u05d4 \u05e0\u05d3\u05d7\u05ea\u05d4" }),
      }),
    });

    expect(uploadFailure).toEqual({ ok: false, errors: { form: "\u05ea\u05de\u05d5\u05e0\u05d4 \u05e0\u05d3\u05d7\u05ea\u05d4" } });

    const serverFailure = await submitDriverOnboarding({
      fields: validFields(),
      licensePhoto: imageFile(),
      accessToken: "local-token",
      uploader: { uploadToSignedUrl: vi.fn().mockResolvedValue({ error: null }) },
      complete: vi.fn().mockResolvedValue({ success: false, message: "\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d4 \u05d4\u05d6\u05de\u05e0\u05d4 \u05de\u05de\u05ea\u05d9\u05e0\u05d4" }),
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ path: "driver/license.png", token: "token" }),
      }),
    });

    expect(serverFailure).toEqual({ ok: false, errors: { form: "\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d4 \u05d4\u05d6\u05de\u05e0\u05d4 \u05de\u05de\u05ea\u05d9\u05e0\u05d4" } });
  });
});
