import type { RepresentativeApiError, RepresentativeSession } from "./types";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw {
      status: 0,
      title: "Network error",
      detail: "Network connection failed. Check your connection and try again.",
    } satisfies RepresentativeApiError;
  }

  if (!response.ok) {
    let errorMessage = response.statusText;
    let redirectTo: string | null | undefined;
    let accountStatus: string | undefined;
    try {
      const payload = (await response.json()) as { error?: string; redirectTo?: string | null; accountStatus?: string };
      if (payload.error) errorMessage = payload.error;
      redirectTo = payload.redirectTo;
      accountStatus = payload.accountStatus;
    } catch { /* ignore */ }

    throw {
      status: response.status,
      title: response.statusText || "Request failed",
      detail:
        response.status === 401
          ? "Invalid email or password"
          : errorMessage,
      redirectTo,
      accountStatus,
    } satisfies RepresentativeApiError;
  }

  return (await response.json()) as T;
}

export async function loginRepresentative(
  email: string,
  password: string,
): Promise<RepresentativeSession> {
  return requestJson<RepresentativeSession>("/api/auth/login-representative", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
