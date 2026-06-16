import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";
import DriverRoutePage from "@/app/driver/page";
import LoginRoutePage from "@/app/login/page";
import DriverLoginPage from "@/app/login_driver/page";
import RegisterDriverPage from "@/app/register-driver/page";
import { OnboardingRoleContainer } from "@/app/onboarding/page";
import { DriverI18nProvider } from "@/components/driver/DriverI18n";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  useRouter: () => ({ replace: vi.fn() }),
}));

function renderWithDriverI18n(element: React.ReactElement) {
  return renderToStaticMarkup(
    React.createElement(DriverI18nProvider, null, element),
  );
}

function expectRedirectsToLoginDriver(Page: React.ComponentType) {
  expect(() => renderToStaticMarkup(React.createElement(Page))).toThrow("NEXT_REDIRECT:/login_driver");
  expect(redirect).toHaveBeenCalledWith("/login_driver");
}

describe("driver routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links the homepage driver entry directly to /login_driver", () => {
    const html = renderToStaticMarkup(React.createElement(LandingPage));

    expect(html).toContain('href="/login_driver"');
    expect(html).not.toContain('href="/driver"');
    expect(html).not.toContain('href="/login"');
  });

  it("renders the driver login page at /login_driver without self-registration links", () => {
    const html = renderWithDriverI18n(React.createElement(DriverLoginPage));

    expect(html).toContain("<form");
    expect(html).toContain("Log in");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain("/register-driver");
    expect(html).not.toContain("Sign Up");
  });

  it("does not keep /login as the driver login flow", () => {
    expectRedirectsToLoginDriver(LoginRoutePage);
  });

  it("does not expose public driver self-registration from /driver", () => {
    expectRedirectsToLoginDriver(DriverRoutePage);
  });

  it("does not expose the standalone public driver registration page", () => {
    expectRedirectsToLoginDriver(RegisterDriverPage);
  });

  it("still renders invite-based driver onboarding", () => {
    const html = renderToStaticMarkup(React.createElement(OnboardingRoleContainer, { role: "driver" }));

    expect(html).toContain('data-testid="driver-onboarding-container"');
    expect(html).toContain('data-testid="driver-onboarding-form"');
  });
});
