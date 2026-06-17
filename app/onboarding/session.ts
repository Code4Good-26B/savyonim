export type OnboardingRole = "driver" | "representative";

export type OnboardingSessionResult =
  | { ok: true; role: OnboardingRole }
  | { ok: false; message: string };

type AuthUser = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

type AuthSession = {
  user?: AuthUser | null;
};

type AuthResponse<T> = {
  data: T;
  error: { message?: string } | null;
};

export type OnboardingSupabaseClient = {
  auth: {
    getSession: () => Promise<AuthResponse<{ session: AuthSession | null }>>;
    getUser?: () => Promise<AuthResponse<{ user: AuthUser | null }>>;
    verifyOtp: (params: { token_hash: string; type: "invite" }) => Promise<AuthResponse<{ session: AuthSession | null; user: AuthUser | null }>>;
    exchangeCodeForSession?: (code: string) => Promise<AuthResponse<{ session: AuthSession | null; user?: AuthUser | null }>>;
  };
};

const INVALID_INVITE_MESSAGE =
  "\u05e7\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d4\u05d6\u05de\u05e0\u05d4 \u05d0\u05d9\u05e0\u05d5 \u05ea\u05e7\u05d9\u05df \u05d0\u05d5 \u05e9\u05e4\u05d2 \u05ea\u05d5\u05e7\u05e4\u05d5. \u05d1\u05e7\u05e9\u05d5 \u05de\u05de\u05e0\u05d4\u05dc \u05dc\u05e9\u05dc\u05d5\u05d7 \u05d4\u05d6\u05de\u05e0\u05d4 \u05d7\u05d3\u05e9\u05d4.";

const UNKNOWN_ROLE_MESSAGE =
  "\u05d7\u05e1\u05e8 \u05d1\u05d4\u05d6\u05de\u05e0\u05d4 \u05ea\u05e4\u05e7\u05d9\u05d3 \u05e0\u05ea\u05de\u05da \u05dc\u05d4\u05e9\u05dc\u05de\u05ea \u05d4\u05d4\u05e8\u05e9\u05de\u05d4. \u05d1\u05e7\u05e9\u05d5 \u05de\u05de\u05e0\u05d4\u05dc \u05dc\u05e9\u05dc\u05d5\u05d7 \u05d4\u05d6\u05de\u05e0\u05d4 \u05d7\u05d3\u05e9\u05d4.";

function normalizeRole(value: unknown): OnboardingRole | null {
  return value === "driver" || value === "representative" ? value : null;
}

export function getOnboardingRole(user: AuthUser | null | undefined): OnboardingRole | null {
  if (!user) return null;

  return (
    normalizeRole(user.app_metadata?.app_role) ??
    normalizeRole(user.user_metadata?.app_role) ??
    normalizeRole(user.user_metadata?.invited_role) ??
    normalizeRole(user.app_metadata?.role) ??
    normalizeRole(user.user_metadata?.role)
  );
}

async function getCurrentUser(client: OnboardingSupabaseClient, fallback?: AuthUser | null) {
  if (!client.auth.getUser) return fallback ?? null;

  const { data, error } = await client.auth.getUser();
  if (error) return fallback ?? null;
  return data.user ?? fallback ?? null;
}

export async function establishOnboardingSession(
  client: OnboardingSupabaseClient,
  search: string | URLSearchParams,
): Promise<OnboardingSessionResult> {
  try {
    const params = typeof search === "string" ? new URLSearchParams(search) : search;
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const hasInviteToken = Boolean(tokenHash && type === "invite");
    const hasInviteCredential = Boolean(code || hasInviteToken);

    let user: AuthUser | null | undefined = null;

    if (hasInviteCredential) {
      if (code) {
        if (!client.auth.exchangeCodeForSession) {
          return { ok: false, message: INVALID_INVITE_MESSAGE };
        }

        const exchanged = await client.auth.exchangeCodeForSession(code);
        if (exchanged.error || !exchanged.data.session) {
          return { ok: false, message: INVALID_INVITE_MESSAGE };
        }
        user = exchanged.data.session.user ?? exchanged.data.user ?? null;
      } else {
        const verified = await client.auth.verifyOtp({
          token_hash: tokenHash!,
          type: "invite",
        });

        if (verified.error || !verified.data.session) {
          return { ok: false, message: INVALID_INVITE_MESSAGE };
        }
        user = verified.data.session.user ?? verified.data.user ?? null;
      }
    } else {
      const existing = await client.auth.getSession();
      user = existing.data.session?.user ?? null;

      if (!existing.data.session) {
        return { ok: false, message: INVALID_INVITE_MESSAGE };
      }
    }

    const currentUser = await getCurrentUser(client, user);
    const role = getOnboardingRole(currentUser);

    if (!role) {
      return { ok: false, message: UNKNOWN_ROLE_MESSAGE };
    }

    return { ok: true, role };
  } catch {
    return { ok: false, message: INVALID_INVITE_MESSAGE };
  }
}

export const onboardingErrorMessages = {
  invalidInvite: INVALID_INVITE_MESSAGE,
  unknownRole: UNKNOWN_ROLE_MESSAGE,
} as const;
