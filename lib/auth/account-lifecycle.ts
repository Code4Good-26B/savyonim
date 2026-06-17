export type AccountStatus = "pending" | "approved" | "rejected";

export const PENDING_APPROVAL_PATH = "/onboarding/pending";
export const REJECTED_ACCOUNT_PATH = "/onboarding/rejected";

export function dashboardPathForRole(role: string): string | null {
  if (role === "driver") return "/driver/dashboard";
  if (role === "representative") return "/representative/dashboard";
  if (role === "admin") return "/admin/statistics";
  return null;
}

export function accountLifecycleRedirect(status: string | null | undefined): string | null {
  if (status === "pending") return PENDING_APPROVAL_PATH;
  if (status === "rejected") return REJECTED_ACCOUNT_PATH;
  return null;
}

export function accountLifecycleMessage(status: string | null | undefined): string {
  if (status === "pending") return "Registration received, waiting for system approval.";
  if (status === "rejected") return "Registration was not approved. Please contact the Savionim team for next steps.";
  return "Account is not approved.";
}
