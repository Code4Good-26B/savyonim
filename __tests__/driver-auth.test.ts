import { describe, it, expect, vi, beforeEach } from "vitest";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/lib/supabase");

function chain(result: object) {
  const handler: ProxyHandler<object> = {
    get(_, prop: string) {
      if (prop === "then")
        return (res: unknown, rej: unknown) =>
          Promise.resolve(result).then(res as never, rej as never);
      if (prop === "catch")
        return (rej: unknown) => Promise.resolve(result).catch(rej as never);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/login", () => {
  it("logs in an active driver and returns a driver session", async () => {
    const fromMock = vi.fn()
      .mockReturnValueOnce(chain({
        data: { id: "u1", full_name: "Driver One", role: "driver", is_active: true },
        error: null,
      }))
      .mockReturnValueOnce(chain({
        data: { id: "d1", user_id: "u1", service_zone_id: "z1", is_active: true },
        error: null,
      }));

    vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "u1" } },
          error: null,
        }),
      },
      from: fromMock,
    } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "driver@example.test", password: "password123" }),
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.driverId).toBe("d1");
    expect(body.role).toBe("driver");
  });

  it("rejects non-driver users", async () => {
    vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "u1" } },
          error: null,
        }),
      },
      from: () => chain({
        data: { id: "u1", full_name: "Admin One", role: "admin", is_active: true },
        error: null,
      }),
    } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);

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
    const fromMock = vi.fn()
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(chain({ data: { id: "d1", service_zone_id: "z1" }, error: null }));

    vi.mocked(supabaseModule.createSupabaseClient).mockReturnValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: "u1" } },
          error: null,
        }),
      },
      from: fromMock,
    } as unknown as ReturnType<typeof supabaseModule.createSupabaseClient>);

    const { POST } = await import("@/app/api/auth/register-driver/route");
    const res = await POST(new Request("http://localhost/api/auth/register-driver", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Driver One",
        email: "driver@example.test",
        password: "password123",
        serviceZoneId: "z1",
      }),
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.userId).toBe("u1");
    expect(body.driverId).toBe("d1");
  });
});
