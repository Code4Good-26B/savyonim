type SupabaseErrorLike = {
  message: string;
  code?: string;
  status?: number | string;
};

const STATUS_BY_CODE: Record<string, number> = {
  PGRST116: 404,
  "23503": 400,
  "23505": 409,
};

function normalizeStatus(status: number | string | undefined): number | null {
  if (typeof status === "number" && status >= 400 && status <= 599) {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number(status);
    if (Number.isInteger(parsed) && parsed >= 400 && parsed <= 599) {
      return parsed;
    }
  }

  return null;
}

export function mapSupabaseErrorStatus(error: SupabaseErrorLike, fallbackStatus = 500): number {
  if (error.code && STATUS_BY_CODE[error.code]) {
    return STATUS_BY_CODE[error.code];
  }

  const fromStatus = normalizeStatus(error.status);
  if (fromStatus !== null) {
    if (fromStatus === 406) {
      return 404;
    }
    return fromStatus;
  }

  return fallbackStatus;
}

export function supabaseErrorResponse(error: SupabaseErrorLike, fallbackStatus = 500): Response {
  return Response.json(
    { error: error.message },
    { status: mapSupabaseErrorStatus(error, fallbackStatus) },
  );
}
