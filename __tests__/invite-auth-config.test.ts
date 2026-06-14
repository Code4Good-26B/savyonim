import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
const inviteTemplate = readFileSync(resolve(root, "supabase/templates/invite.html"), "utf8");
const envExample = readFileSync(resolve(root, ".env.example"), "utf8");

describe("Supabase invite auth configuration", () => {
  it("uses invite-only auth with a 24-hour token and onboarding redirects", () => {
    expect(config).toContain('site_url = "http://localhost:3000"');
    expect(config).toContain('"http://localhost:3000/onboarding"');
    expect(config).toMatch(/\[auth\][\s\S]*?enable_signup = false/);
    expect(config).toMatch(/\[auth\.email\][\s\S]*?enable_signup = false/);
    expect(config).toContain("otp_expiry = 86400");
    expect(config).toContain('[auth.email.template.invite]');
    expect(config).toContain('content_path = "./supabase/templates/invite.html"');
  });

  it("links invite recipients to onboarding with a one-time token hash", () => {
    expect(inviteTemplate).toContain("{{ .SiteURL }}/onboarding");
    expect(inviteTemplate).toContain("token_hash={{ .TokenHash }}");
    expect(inviteTemplate).toContain("type=invite");
  });

  it("documents all required public, server-only, URL, and SMTP variables", () => {
    for (const variable of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "APP_URL",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_ADMIN_EMAIL",
      "SMTP_SENDER_NAME",
    ]) {
      expect(envExample).toContain(`${variable}=`);
    }
  });
});
