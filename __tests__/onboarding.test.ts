import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  establishOnboardingSession,
  getOnboardingRole,
  onboardingErrorMessages,
  type OnboardingSupabaseClient,
} from "@/app/onboarding/session";
import { OnboardingRoleContainer } from "@/app/onboarding/page";

function buildClient(overrides: Partial<OnboardingSupabaseClient["auth"]>): OnboardingSupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
      ...overrides,
    },
  };
}

describe("onboarding invite session exchange", () => {
  it("exchanges a valid invite code for a session", async () => {
    const client = buildClient({
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: {
          session: { user: { user_metadata: { app_role: "driver" } } },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { app_role: "driver" } } },
        error: null,
      }),
    });

    const result = await establishOnboardingSession(client, "?code=valid-code");

    expect(result).toEqual({ ok: true, role: "driver" });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
  });

  it("exchanges an invite code before checking an existing session", async () => {
    const client = buildClient({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { user: { app_metadata: { app_role: "representative" } } },
        },
        error: null,
      }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: {
          session: { user: { app_metadata: { app_role: "driver" } } },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { app_metadata: { app_role: "driver" } } },
        error: null,
      }),
    });

    const result = await establishOnboardingSession(client, "?code=invite-code");

    expect(result).toEqual({ ok: true, role: "driver" });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith("invite-code");
    expect(client.auth.getSession).not.toHaveBeenCalled();
  });

  it("resumes an existing onboarding session without requiring invite parameters", async () => {
    const client = buildClient({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { user: { user_metadata: { app_role: "representative" } } },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { app_role: "representative" } } },
        error: null,
      }),
    });

    const result = await establishOnboardingSession(client, "");

    expect(result).toEqual({ ok: true, role: "representative" });
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies a valid token-hash invite link", async () => {
    const client = buildClient({
      verifyOtp: vi.fn().mockResolvedValue({
        data: {
          session: { user: { user_metadata: { app_role: "driver" } } },
          user: { user_metadata: { app_role: "driver" } },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { app_role: "driver" } } },
        error: null,
      }),
    });

    const result = await establishOnboardingSession(client, "?token_hash=token&type=invite");

    expect(result).toEqual({ ok: true, role: "driver" });
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "token", type: "invite" });
  });

  it("verifies an invite token before checking an existing session", async () => {
    const client = buildClient({
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { user: { app_metadata: { app_role: "representative" } } },
        },
        error: null,
      }),
      verifyOtp: vi.fn().mockResolvedValue({
        data: {
          session: { user: { app_metadata: { app_role: "driver" } } },
          user: { app_metadata: { app_role: "driver" } },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { app_metadata: { app_role: "driver" } } },
        error: null,
      }),
    });

    const result = await establishOnboardingSession(client, "?token_hash=token&type=invite");

    expect(result).toEqual({ ok: true, role: "driver" });
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "token", type: "invite" });
    expect(client.auth.getSession).not.toHaveBeenCalled();
  });

  it("returns a clear error for invalid or expired invite links", async () => {
    const client = buildClient({
      verifyOtp: vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: "expired" },
      }),
    });

    const result = await establishOnboardingSession(client, "?token_hash=expired&type=invite");

    expect(result).toEqual({
      ok: false,
      message: onboardingErrorMessages.invalidInvite,
    });
  });

  it("returns a safe error when app_role is missing or unknown", async () => {
    const client = buildClient({
      verifyOtp: vi.fn().mockResolvedValue({
        data: {
          session: { user: { user_metadata: { app_role: "volunteer" } } },
          user: { user_metadata: { app_role: "volunteer" } },
        },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { user_metadata: { app_role: "volunteer" } } },
        error: null,
      }),
    });

    const result = await establishOnboardingSession(client, "?token_hash=token&type=invite");

    expect(result).toEqual({
      ok: false,
      message: onboardingErrorMessages.unknownRole,
    });
  });
});

describe("onboarding role routing", () => {
  it("prefers trusted app_metadata app_role over user metadata role values", () => {
    expect(
      getOnboardingRole({
        app_metadata: { app_role: "driver" },
        user_metadata: { app_role: "representative", invited_role: "representative" },
      }),
    ).toBe("driver");
  });

  it("falls back to invite-time user metadata when trusted app metadata is missing", () => {
    expect(getOnboardingRole({ user_metadata: { app_role: "driver" } })).toBe("driver");
    expect(getOnboardingRole({ user_metadata: { invited_role: "representative" } })).toBe("representative");
  });

  it("supports existing non-invite role metadata formats", () => {
    expect(getOnboardingRole({ app_metadata: { role: "driver" } })).toBe("driver");
    expect(getOnboardingRole({ user_metadata: { role: "representative" } })).toBe("representative");
  });

  it("renders the driver onboarding form container", () => {
    const html = renderToStaticMarkup(React.createElement(OnboardingRoleContainer, { role: "driver" }));

    expect(html).toContain("data-testid=\"driver-onboarding-container\"");
    expect(html).toContain("Driver onboarding");
  });

  it("renders the representative onboarding form container", () => {
    const html = renderToStaticMarkup(React.createElement(OnboardingRoleContainer, { role: "representative" }));

    expect(html).toContain("data-testid=\"representative-onboarding-container\"");
    expect(html).toContain("Representative onboarding");
  });
});
