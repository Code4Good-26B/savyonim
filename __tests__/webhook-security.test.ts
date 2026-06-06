import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "@/lib/webhook-security";

describe("webhook security", () => {
  it("accepts a valid signature and timestamp", () => {
    const rawBody = JSON.stringify({ hello: "world" });
    const timestamp = new Date().toISOString();
    const secret = "test-secret";
    const signature = signWebhookPayload(rawBody, timestamp, secret);

    const result = verifyWebhookSignature({
      rawBody,
      timestamp,
      signature,
      secret,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a mismatched signature", () => {
    const rawBody = JSON.stringify({ hello: "world" });
    const timestamp = new Date().toISOString();

    const result = verifyWebhookSignature({
      rawBody,
      timestamp,
      signature: "sha256=badbadbad",
      secret: "test-secret",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/mismatch/i);
    }
  });

  it("rejects stale timestamps", () => {
    const rawBody = JSON.stringify({ hello: "world" });
    const secret = "test-secret";
    const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const signature = signWebhookPayload(rawBody, oldTimestamp, secret);

    const result = verifyWebhookSignature({
      rawBody,
      timestamp: oldTimestamp,
      signature,
      secret,
      maxAgeSeconds: 60,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/outside accepted window/i);
    }
  });
});
