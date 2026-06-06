import { describe, expect, it } from "vitest";
import {
  validateDriverLocationUpdateWebhookPayload,
  validateRideRequestWebhookPayload,
} from "@/lib/webhook-contracts";

describe("ride request webhook contract", () => {
  it("validates a complete payload", () => {
    const result = validateRideRequestWebhookPayload({
      request_id: "req-1",
      service_zone: { region_code: "TLV-N" },
      passenger: {
        full_name: "Passenger One",
        phone: "050-1234567",
        mobility_need: "walker",
      },
      trip: {
        source_address: "A",
        destination_address: "B",
        requested_pickup_at: new Date().toISOString(),
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = validateRideRequestWebhookPayload({
      request_id: "req-2",
      service_zone: {},
      passenger: { full_name: "Passenger One" },
      trip: { source_address: "A" },
    });

    expect(result.ok).toBe(false);
  });
});

describe("driver location webhook contract", () => {
  it("validates numeric coordinates", () => {
    const result = validateDriverLocationUpdateWebhookPayload({
      driver_id: "driver-1",
      latitude: 32.0853,
      longitude: 34.7818,
      recorded_at: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
  });

  it("rejects invalid latitude", () => {
    const result = validateDriverLocationUpdateWebhookPayload({
      driver_id: "driver-1",
      latitude: 132.0853,
      longitude: 34.7818,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/latitude/i);
    }
  });
});
