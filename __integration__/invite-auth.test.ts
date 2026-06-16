import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";
import { completeOnboarding, approveUser } from "@/app/actions/auth";
import { signInSeedUser } from "./helpers";

const localMailUrl = "http://127.0.0.1:54324";

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function createLocalAccessToken(userId: string) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("Missing JWT_SECRET for local integration auth");

  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify({
    iss: "supabase",
    aud: "authenticated",
    role: "authenticated",
    sub: userId,
    iat: now,
    exp: now + 60 * 60,
  }));
  const signature = createHmac("sha256", jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

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
    expect(res.message).toContain("\u05ea\u05e2\u05d5\u05d3\u05ea");
  });

  it("completeOnboarding requires driver license and consent fields", async () => {
    const { getPool } = await import("@/lib/db");
    await getPool().query(`
      insert into public.invitations (email, invited_role, status, invited_by)
      values ('admin.dispatch@savionim.test', 'driver', 'pending', '22222222-0000-0000-0000-000000000010')
      on conflict do nothing
    `);

    const res = await completeOnboarding(adminToken, {
      fullName: "Test User",
      phone: "+972501234567",
      nationalId: "123456782",
      password: "password123",
      licensePhotoPath: "path/to/photo",
      birthYear: 1990,
      gender: "female",
      location: "Haifa",
      licenseIssueYear: 2015,
      consentCriminalRecord: true,
      ownsVehicleAmbulatory: true,
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("\u05e1\u05d5\u05d2");
  });

  it("completeOnboarding creates a pending driver and stores license photo metadata", async () => {
    const email = `driver-onboarding-${Date.now()}@example.test`;
    const password = "InviteLocal123!";
    const supabaseAdmin = (await import("@/lib/supabase")).createSupabaseClient();
    const { getPool } = await import("@/lib/db");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { app_role: "driver" },
      user_metadata: { app_role: "driver", invited_role: "driver" },
    });
    expect(createError).toBeNull();
    expect(created.user?.id).toBeTruthy();

    const userId = created.user!.id;

    try {
      await getPool().query(
        `insert into public.invitations (email, invited_role, status, invited_by, auth_user_id)
         values ($1, 'driver', 'pending', '22222222-0000-0000-0000-000000000010', $2)`,
        [email, userId],
      );

      const accessToken = createLocalAccessToken(userId);

      const res = await completeOnboarding(accessToken, {
        fullName: "Task Fifteen Driver",
        phone: "+972501234567",
        nationalId: "200000008",
        password: "NewInviteLocal123!",
        location: "Tel Aviv",
        birthYear: 1991,
        gender: "male",
        licenseType: "B",
        licenseIssueYear: 2014,
        licensePhotoPath: `${userId}/license.png`,
        consentCriminalRecord: true,
        ownsVehicleAmbulatory: true,
      });

      expect(res.success).toBe(true);

      const dbUser = await getPool().query(
        `select full_name, phone, role, status, national_id from public.users where id = $1`,
        [userId],
      );
      expect(dbUser.rows[0]).toMatchObject({
        full_name: "Task Fifteen Driver",
        phone: "+972501234567",
        role: "driver",
        status: "pending",
        national_id: "200000008",
      });

      const driver = await getPool().query(
        `select location, birth_year, gender, license_type, license_issue_year, license_photo_path,
                consent_criminal_record, owns_vehicle_ambulatory
         from public.drivers where user_id = $1`,
        [userId],
      );
      expect(driver.rows[0]).toMatchObject({
        location: "Tel Aviv",
        birth_year: 1991,
        gender: "male",
        license_type: "B",
        license_issue_year: 2014,
        license_photo_path: `${userId}/license.png`,
        consent_criminal_record: true,
        owns_vehicle_ambulatory: true,
      });

      const invite = await getPool().query(`select status from public.invitations where auth_user_id = $1`, [userId]);
      expect(invite.rows[0]).toMatchObject({ status: "accepted" });
    } finally {
      await getPool().query(`delete from public.invitations where auth_user_id = $1 or email = $2`, [userId, email]);
      await getPool().query(`delete from public.drivers where user_id = $1`, [userId]);
      await getPool().query(`delete from public.users where id = $1`, [userId]);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
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
