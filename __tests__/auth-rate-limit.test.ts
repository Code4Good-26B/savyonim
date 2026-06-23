import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  getPool: vi.fn(),
}));

describe("Authentication rate limiting", () => {
  it("returns 429 after 5 attempts for the same IP+email on the driver login", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const makeRequest = () => {
      return POST(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "x-forwarded-for": "10.0.0.1" },
          body: JSON.stringify({ email: "limit-test@example.com", password: "pwd" }),
        })
      );
    };

    // Assuming default AUTH_RATE_LIMIT_MAX = 5
    // First 5 should go through to the DB/Auth logic (returning 400 or 401 because mocked)
    for (let i = 0; i < 5; i++) {
      const res = await makeRequest();
      expect(res.status).not.toBe(429);
    }

    // 6th should hit the rate limiter and return 429
    const rateLimitedRes = await makeRequest();
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.headers.get("Retry-After")).toBeTruthy();
    
    const body = await rateLimitedRes.json();
    expect(body.error).toBe("Rate limit exceeded");
  });
});
