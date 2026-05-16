import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authModule from "@/lib/auth/local-auth";
import * as dbModule from "@/lib/db";

vi.mock("@/lib/auth/local-auth");
vi.mock("@/lib/db");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authModule.signDriverToken).mockReturnValue({
    token: "signed.jwt.token",
    expiresAt: "2026-05-17T00:00:00.000Z",
  });
});

describe("POST /api/auth/login", () => {
  it("logs in an active driver and returns a driver session", async () => {
    vi.mocked(dbModule.query).mockResolvedValue({
      rows: [{
        user_id: "u1",
        driver_id: "d1",
        full_name: "Driver One",
        email: "driver@example.test",
        password_hash: "hash",
        service_zone_id: "z1",
        user_active: true,
        driver_active: true,
      }],
      rowCount: 1,
    } as never);
    vi.mocked(authModule.verifyPassword).mockResolvedValue(true);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "driver@example.test", password: "password123" }),
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.driverId).toBe("d1");
    expect(body.role).toBe("driver");
    expect(body.token).toBe("signed.jwt.token");
  });

  it("rejects non-driver users", async () => {
    vi.mocked(dbModule.query).mockResolvedValue({
      rows: [{
        user_id: "u1",
        driver_id: "d1",
        full_name: "Driver One",
        email: "driver@example.test",
        password_hash: "hash",
        service_zone_id: "z1",
        user_active: false,
        driver_active: true,
      }],
      rowCount: 1,
    } as never);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.test", password: "password123" }),
    }));

    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/register-driver", () => {
  it("creates auth user, app user, and driver profile", async () => {
    vi.mocked(dbModule.query)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ id: "z1" }], rowCount: 1 } as never);
    vi.mocked(authModule.hashPassword).mockResolvedValue("hash");
    vi.mocked(dbModule.transaction).mockImplementation(async (callback) => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 1 })
          .mockResolvedValueOnce({
            rows: [{ user_id: "u1", driver_id: "d1", service_zone_id: "11111111-1000-0000-0000-000000000001" }],
            rowCount: 1,
          }),
      };

      return callback(client as never);
    });

    const { POST } = await import("@/app/api/auth/register-driver/route");
    const res = await POST(new Request("http://localhost/api/auth/register-driver", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Driver One",
        email: "driver@example.test",
        password: "password123",
        serviceZoneId: "11111111-1000-0000-0000-000000000001",
      }),
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.userId).toBe("u1");
    expect(body.driverId).toBe("d1");
  });
});
