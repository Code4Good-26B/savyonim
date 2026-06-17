import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PendingPage from "@/app/onboarding/pending/page";
import RejectedPage from "@/app/onboarding/rejected/page";
import {
  PENDING_APPROVAL_PATH,
  REJECTED_ACCOUNT_PATH,
  accountLifecycleRedirect,
  dashboardPathForRole,
} from "@/lib/auth/account-lifecycle";

const queryMock = vi.fn();
const verifyPasswordMock = vi.fn();
const signDriverTokenMock = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

vi.mock("@/lib/auth/local-auth", () => ({
  verifyPassword: (...args: unknown[]) => verifyPasswordMock(...args),
  signDriverToken: (...args: unknown[]) => signDriverTokenMock(...args),
}));

function authRow(status: "pending" | "approved" | "rejected") {
  return {
    user_id: "22222222-0000-0000-0000-000000000001",
    driver_id: "33333333-0000-0000-0000-000000000001",
    full_name: "Driver One",
    email: "driver@example.test",
    password_hash: "hash",
    service_zone_id: "11111111-0000-0000-0000-000000000001",
    user_active: status === "approved",
    driver_active: status === "approved",
    account_status: status,
  };
}

async function postDriverLogin(status: "pending" | "approved" | "rejected") {
  queryMock.mockResolvedValueOnce({ rows: [authRow(status)] });
  verifyPasswordMock.mockResolvedValueOnce(true);
  signDriverTokenMock.mockReturnValueOnce({
    token: "signed-token",
    expiresAt: "2026-06-18T00:00:00.000Z",
  });

  const { POST } = await import("@/app/api/auth/login/route");
  return POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "driver@example.test", password: "LocalPass123!" }),
    }),
  );
}

describe("account lifecycle screens", () => {
  it("renders the pending approval waiting state", () => {
    const html = renderToStaticMarkup(React.createElement(PendingPage));

    expect(html).toContain("Registration received, waiting for system approval.");
    expect(html).toContain("Waiting for approval");
  });

  it("renders the rejected state with contact and next-step guidance", () => {
    const html = renderToStaticMarkup(React.createElement(RejectedPage));

    expect(html).toContain("Account registration was rejected");
    expect(html).toContain("contact the Savionim team");
    expect(html).toContain("next steps");
  });

  it("keeps driver onboarding submit pointed at the pending screen", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../app/onboarding/DriverOnboardingForm.tsx"),
      "utf8",
    );

    expect(source).toContain('window.location.assign("/onboarding/pending")');
  });
});

describe("account lifecycle routing", () => {
  beforeEach(() => {
    queryMock.mockReset();
    verifyPasswordMock.mockReset();
    signDriverTokenMock.mockReset();
  });

  it("maps non-approved statuses to lifecycle screens", () => {
    expect(accountLifecycleRedirect("pending")).toBe(PENDING_APPROVAL_PATH);
    expect(accountLifecycleRedirect("rejected")).toBe(REJECTED_ACCOUNT_PATH);
    expect(accountLifecycleRedirect("approved")).toBeNull();
  });

  it("maps approved users to the correct dashboards on login", () => {
    expect(dashboardPathForRole("driver")).toBe("/driver/dashboard");
    expect(dashboardPathForRole("representative")).toBe("/representative/dashboard");
    expect(dashboardPathForRole("admin")).toBe("/admin/statistics");
  });

  it("returns a pending redirect instead of a driver session for pending users", async () => {
    const response = await postDriverLogin("pending");
    const body = await response.json();

    const [sql] = queryMock.mock.calls[0];
    expect(sql).toContain("u.status::text as account_status");
    expect(sql).not.toContain("coalesce(to_jsonb(u)->>'status'");
    expect(response.status).toBe(403);
    expect(body.accountStatus).toBe("pending");
    expect(body.redirectTo).toBe(PENDING_APPROVAL_PATH);
    expect(body.error).toContain("waiting for system approval");
  });

  it("returns a rejected redirect and next-step message for rejected users", async () => {
    const response = await postDriverLogin("rejected");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.accountStatus).toBe("rejected");
    expect(body.redirectTo).toBe(REJECTED_ACCOUNT_PATH);
    expect(body.error).toContain("contact the Savionim team");
  });

  it("returns an approved driver session for approved users", async () => {
    const response = await postDriverLogin("approved");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.role).toBe("driver");
    expect(body.token).toBe("signed-token");
    expect(body.redirectTo).toBeUndefined();
  });
});

describe("approval-state source of truth", () => {
  function source(path: string) {
    return readFileSync(resolve(import.meta.dirname, "..", path), "utf8");
  }

  it("writes approval decisions to public.users.status", () => {
    const adminActions = source("app/admin/(portal)/approvals/actions.ts");
    const representativeActions = source("app/representative/(portal)/approvals/actions.ts");
    const inviteAuthActions = source("app/actions/auth.ts");

    for (const text of [adminActions, representativeActions, inviteAuthActions]) {
      expect(text).toContain("public.users");
      expect(text).toContain("status = 'approved'");
      expect(text).toContain("status = 'rejected'");
    }
  });

  it("lists pending approvals from public.users.status", () => {
    expect(source("app/admin/(portal)/approvals/page.tsx")).toContain("WHERE u.status = 'pending'");
    expect(source("app/representative/(portal)/approvals/page.tsx")).toContain("u.status = 'pending'");
  });

  it("reads lifecycle guards from public.users.status instead of metadata or cookies", () => {
    expect(source("lib/auth/guards.ts")).toContain("select role, status, can_approve_drivers from public.users");
    expect(source("app/admin/(portal)/layout.tsx")).toContain("SELECT role, status, is_active, full_name FROM public.users");
    expect(source("app/representative/(portal)/layout.tsx")).toContain("SELECT role, status, is_active, full_name FROM public.users");
    expect(source("app/api/auth/login/route.ts")).toContain("u.status::text as account_status");
    expect(source("app/api/auth/login-representative/route.ts")).toContain("select full_name, role, status, is_active from public.users");
    expect(source("app/api/auth/login-admin/route.ts")).toContain("SELECT full_name, role, status, is_active FROM public.users");
  });
});
