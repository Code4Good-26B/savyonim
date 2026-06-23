type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function readClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }

  const [first] = forwardedFor.split(",");
  return first?.trim() || "unknown";
}

function cleanupBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function enforceRateLimit(
  request: Request,
  {
    keyPrefix,
    limit,
    windowMs,
    identifier,
  }: {
    keyPrefix: string;
    limit: number;
    windowMs: number;
    identifier?: string;
  },
): Response | null {
  const now = Date.now();
  cleanupBuckets(now);

  const ip = readClientIp(request);
  const key = identifier ? `${keyPrefix}:${ip}:${identifier}` : `${keyPrefix}:${ip}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return Response.json(
      {
        error: "Rate limit exceeded",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  existing.count += 1;
  buckets.set(key, existing);

  return null;
}
