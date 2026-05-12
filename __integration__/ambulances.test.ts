/**
 * Integration tests for GET /api/ambulances
 *
 * These hit the REAL local Supabase Docker DB (not mocks).
 * Before running, make sure:
 *   1. Docker is running
 *   2. `npx supabase start` has been run at least once
 *
 * Run just integration tests:
 *   npm run test:integration
 *
 * The global setup (setup.ts) resets + re-seeds the DB before each run.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/ambulances/route";

// IDs from seed.sql
const SEED_AMBULANCE_1 = "44444444-0000-0000-0000-000000000001";
const SEED_AMBULANCE_2 = "44444444-0000-0000-0000-000000000002";

describe("GET /api/ambulances (integration)", () => {
  it("returns the 2 ambulances seeded in seed.sql", async () => {
    const res = await GET();

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    const ids = body.map((a: { id: string }) => a.id);
    expect(ids).toContain(SEED_AMBULANCE_1);
    expect(ids).toContain(SEED_AMBULANCE_2);
  });

  it("returns ambulances ordered by license_plate", async () => {
    const res = await GET();
    const body = await res.json();
    const plates = body.map((a: { license_plate: string }) => a.license_plate);

    expect(plates).toEqual([...plates].sort());
  });

  it("each ambulance has the expected shape", async () => {
    const res = await GET();
    const [first] = await res.json();

    expect(first).toMatchObject({
      id: expect.any(String),
      license_plate: expect.any(String),
      service_zone_id: expect.any(String),
      is_available: expect.any(Boolean),
      is_active: expect.any(Boolean),
    });
  });
});
