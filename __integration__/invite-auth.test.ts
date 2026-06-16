import { describe, it, expect, beforeAll } from "vitest";
import { completeOnboarding, approveUser } from "@/app/actions/auth";
import { signInSeedUser } from "./helpers";

const localMailUrl = "http://127.0.0.1:54324";

async function waitForInvite(email: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${localMailUrl}/api/v1/messages`);
    if (response.ok) {
      const mailbox = (await response.json()) as {
        messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
      };
      const message = mailbox.messages.find((candidate) =>
        candidate.To.some((recipient) => recipient.Address.toLowerCase() === email.toLowerCase()),
      );
      if (message) return message;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Invite email for ${email} was not delivered to Inbucket`);
}

describe("Invite-Auth Flow", () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await signInSeedUser("admin.dispatch@savionim.test");
  });

  it("completeOnboarding validates input fields", async () => {
    const { getPool } = await import("@/lib/db");
    await getPool().query(`
      insert into public.invitations (email, invited_role, status, invited_by)
      values ('admin.dispatch@savionim.test', 'driver', 'pending', '22222222-0000-0000-0000-000000000010')
      on conflict do nothing
    `);

    const res = await completeOnboarding(adminToken, {
      fullName: "Test User",
      phone: "+972501234567",
      nationalId: "123", // invalid
      password: "password123",
      licensePhotoPath: "path/to/photo",
      birthYear: 1990
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("National ID");
  });

  it("approveUser blocks unauthenticated calls", async () => {
    const res = await approveUser("fake-admin-token", "target-id");
    expect(res.success).toBe(false);
    expect(res.message).toBe("Unauthorized");
  });

  it("delivers an invite to Inbucket and exchanges its onboarding token for a session", async () => {
    const email = `invite-auth-${Date.now()}@example.test`;
    const supabaseAdmin = (await import("@/lib/supabase")).createSupabaseClient();

    const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    expect(inviteError).toBeNull();
    expect(invite.user?.email).toBe(email);

    try {
      const message = await waitForInvite(email);
      const response = await fetch(`${localMailUrl}/api/v1/message/${message.ID}`);
      expect(response.ok).toBe(true);

      const body = (await response.json()) as { HTML?: string };
      const html = body.HTML ?? "";
      const href = html.match(/href=["']([^"']+)["']/)?.[1]?.replaceAll("&amp;", "&");
      expect(href).toBeDefined();

      const inviteUrl = new URL(href!);
      expect(inviteUrl.origin).toBe("http://localhost:3000");
      expect(inviteUrl.pathname).toBe("/onboarding");
      expect(inviteUrl.searchParams.get("type")).toBe("invite");

      const tokenHash = inviteUrl.searchParams.get("token_hash");
      expect(tokenHash).toBeTruthy();

      const supabase = (await import("@/lib/supabase")).createSupabaseAnonClient();
      const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: "invite",
      });

      expect(verifyError).toBeNull();
      expect(verified.session?.access_token).toBeTruthy();
      expect(verified.user?.email).toBe(email);
    } finally {
      if (invite.user?.id) await supabaseAdmin.auth.admin.deleteUser(invite.user.id);
    }
  });

  it("rejects public email self-signup", async () => {
    const supabase = (await import("@/lib/supabase")).createSupabaseAnonClient();
    const { data, error } = await supabase.auth.signUp({
      email: `blocked-signup-${Date.now()}@example.test`,
      password: "NotAllowed123!",
    });

    expect(data.user).toBeNull();
    expect(error?.message.toLowerCase()).toContain("signups not allowed");
  });
});
