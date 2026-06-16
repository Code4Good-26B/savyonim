import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("driver login routing", () => {
  it("routes the homepage driver entry directly to /login_driver", () => {
    const page = source("app/page.tsx");

    expect(page).toContain('href: "/login_driver"');
    expect(page).not.toContain('href: "/driver"');
  });

  it("/login_driver owns the driver login UI", () => {
    const loginDriverPage = source("app/login_driver/page.tsx");

    expect(loginDriverPage).toContain('data-testid="driver-login-form"');
    expect(loginDriverPage).toContain("loginDriver");
    expect(existsSync(resolve(root, "app/login/page.tsx"))).toBe(false);
  });

  it("/driver does not expose public self-registration as the main flow", () => {
    const driverPage = source("app/driver/page.tsx");

    expect(driverPage).toContain('href="/login_driver"');
    expect(driverPage).not.toContain("/register-driver");
  });

  it("public register-driver route is bypassed to driver login", () => {
    const registerPage = source("app/register-driver/page.tsx");

    expect(registerPage).toContain('redirect("/login_driver")');
  });

  it("invite onboarding remains routed through /onboarding links", () => {
    const inviteTemplate = source("supabase/templates/invite.html");
    const onboardingPage = source("app/onboarding/page.tsx");

    expect(inviteTemplate).toContain("/onboarding");
    expect(onboardingPage).toContain("establishOnboardingSession");
    expect(onboardingPage).toContain("window.location.search");
  });
});
