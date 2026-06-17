import { verifySupabaseJwt } from "@/lib/api-auth";
import { readBearerToken } from "@/lib/supabase";
import { query } from "@/lib/db";
import { accountLifecycleMessage, accountLifecycleRedirect } from "@/lib/auth/account-lifecycle";

type DbUserRow = {
  role: string;
  status: string;
  can_approve_drivers: boolean;
};

export type GuardContext = {
  userId: string;
  role: string;
  status: string;
  canApproveDrivers: boolean;
};

export type GuardResult =
  | { ok: true; ctx: GuardContext }
  | { ok: false; error: string; httpStatus: number; accountStatus?: string; redirectTo?: string | null };

export async function requireApproved(request: Request): Promise<GuardResult> {
  const token = readBearerToken(request);
  if (!token) return { ok: false, error: "Missing Authorization header", httpStatus: 401 };

  const claims = verifySupabaseJwt(token);
  if (!claims) return { ok: false, error: "Invalid or expired token", httpStatus: 401 };

  const result = await query<DbUserRow>(
    `select role, status, can_approve_drivers from public.users where id = $1`,
    [claims.sub],
  );

  const user = result.rows[0];
  if (!user) return { ok: false, error: "User not found", httpStatus: 401 };
  if (user.status !== "approved") {
    return {
      ok: false,
      error: accountLifecycleMessage(user.status),
      httpStatus: 403,
      accountStatus: user.status,
      redirectTo: accountLifecycleRedirect(user.status),
    };
  }

  return {
    ok: true,
    ctx: {
      userId: claims.sub,
      role: user.role,
      status: user.status,
      canApproveDrivers: user.can_approve_drivers,
    },
  };
}

export const requireApprovedBearerAuth = requireApproved;

export async function requireRepresentativeOrAdminAuth(request: Request): Promise<GuardResult> {
  const result = await requireApproved(request);
  if (!result.ok) return result;

  if (result.ctx.role !== "representative" && result.ctx.role !== "admin") {
    return { ok: false, error: "Insufficient permissions", httpStatus: 403 };
  }

  return result;
}

export function guardError(result: Extract<GuardResult, { ok: false }>) {
  return Response.json(
    {
      error: result.error,
      accountStatus: result.accountStatus,
      redirectTo: result.redirectTo,
    },
    { status: result.httpStatus },
  );
}
