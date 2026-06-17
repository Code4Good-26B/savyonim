import { describe, expect, it, vi } from "vitest";
import { PENDING_APPROVAL_PATH } from "@/lib/auth/account-lifecycle";

const requireApprovedMock = vi.fn();

vi.mock("@/lib/auth/guards", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/guards")>("@/lib/auth/guards");
  return {
    ...actual,
    requireApproved: (...args: unknown[]) => requireApprovedMock(...args),
  };
});

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  getPool: vi.fn(),
}));

describe("driver account gating", () => {
  it("blocks pending users from driver app data routes with a pending-screen redirect", async () => {
    requireApprovedMock.mockResolvedValueOnce({
      ok: false,
      error: "Registration received, waiting for system approval.",
      httpStatus: 403,
      accountStatus: "pending",
      redirectTo: PENDING_APPROVAL_PATH,
    });

    const { GET } = await import("@/app/api/driver/rides/route");
    const response = await GET(new Request("http://localhost/api/driver/rides"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.accountStatus).toBe("pending");
    expect(body.redirectTo).toBe(PENDING_APPROVAL_PATH);
  });
});
