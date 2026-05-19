import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_AGE_SECONDS = 300;
const DEV_FALLBACK_SECRET = "dev-only-commbox-secret";

export function getWebhookSecret(): string | null {
  const explicitSecret = process.env.COMMBOX_WEBHOOK_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }

  return null;
}

export function signWebhookPayload(rawBody: string, timestamp: string, secret: string): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return `sha256=${digest}`;
}

function normalizeSignature(signature: string | null | undefined): string | null {
  if (!signature) {
    return null;
  }

  const trimmed = signature.trim().toLowerCase();
  return trimmed.startsWith("sha256=") ? trimmed.slice("sha256=".length) : trimmed;
}

function parseTimestampMillis(timestamp: string): number | null {
  const trimmed = timestamp.trim();

  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
      return null;
    }

    if (trimmed.length <= 10) {
      return value * 1000;
    }

    return value;
  }

  const isoValue = Date.parse(trimmed);
  if (!Number.isFinite(isoValue)) {
    return null;
  }

  return isoValue;
}

export function verifyWebhookSignature({
  rawBody,
  timestamp,
  signature,
  secret,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
}: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  maxAgeSeconds?: number;
}): { ok: true } | { ok: false; error: string } {
  if (!timestamp) {
    return { ok: false, error: "Missing webhook timestamp" };
  }

  if (!signature) {
    return { ok: false, error: "Missing webhook signature" };
  }

  const timestampMs = parseTimestampMillis(timestamp);
  if (timestampMs === null) {
    return { ok: false, error: "Invalid webhook timestamp format" };
  }

  const now = Date.now();
  const maxDrift = maxAgeSeconds * 1000;
  if (Math.abs(now - timestampMs) > maxDrift) {
    return { ok: false, error: "Webhook timestamp outside accepted window" };
  }

  const expected = normalizeSignature(signWebhookPayload(rawBody, timestamp, secret));
  const provided = normalizeSignature(signature);

  if (!expected || !provided) {
    return { ok: false, error: "Invalid webhook signature format" };
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return { ok: false, error: "Webhook signature mismatch" };
  }

  const valid = timingSafeEqual(expectedBuffer, providedBuffer);
  if (!valid) {
    return { ok: false, error: "Webhook signature mismatch" };
  }

  return { ok: true };
}
