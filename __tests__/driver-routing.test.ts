import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";
import DriverRoutePage from "@/app/driver/page";
import LoginRoutePage from "@/app/login/page";
import RegisterDriverPage from "@/app/register-driver/page";
import { OnboardingRoleContainer } from "@/app/onboarding/page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  useRouter: () => ({ replace: vi.fn() }),
}));

function expectRedirectsToLogin(Page: React.ComponentType) {
  expect(() => renderToStaticMarkup(React.createElement(Page))).toThrow("NEXT_REDIRECT:/login");
  expect(redirect).toHaveBeenCalledWith("/login");
}

describe("driver routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the shared login page with driver role available", () => {
    const html = renderToStaticMarkup(React.createElement(LandingPage));

    expect(html).toContain("<form");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain("/register-driver");
  });

  it("serves the shared login page at /login", () => {
    const html = renderToStaticMarkup(React.createElement(LoginRoutePage));

    expect(html).toContain("<form");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
  });

  it("does not expose public driver self-registration from /driver", () => {
    expectRedirectsToLogin(DriverRoutePage);
  });

  it("does not expose the standalone public driver registration page", () => {
    expectRedirectsToLogin(RegisterDriverPage);
  });

  it("still renders invite-based driver onboarding", () => {
    const html = renderToStaticMarkup(React.createElement(OnboardingRoleContainer, { role: "driver" }));

    expect(html).toContain('data-testid="driver-onboarding-container"');
    expect(html).toContain('data-testid="driver-onboarding-form"');
  });
});
