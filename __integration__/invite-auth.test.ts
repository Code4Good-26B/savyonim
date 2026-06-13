import { describe, it, expect, beforeAll } from "vitest";
import { completeOnboarding, approveUser } from "@/app/actions/auth";
import { signInSeedUser } from "./helpers";

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
});
