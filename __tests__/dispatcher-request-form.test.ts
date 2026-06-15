import { describe, it, expect } from "vitest";
import { isValid, buildPayload, EMPTY_FORM, type FormState } from "@/app/representative/(portal)/requests/new/form-logic";
import { assignedDriver, type RideDriver } from "@/app/representative/(portal)/requests/assigned-driver";
import { validateIntakeRideRequestInput } from "@/lib/intake-contract";

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SELF_MEDICAL: FormState = {
  ...EMPTY_FORM,
  caller_full_name: "Avi Cohen",
  caller_id_number: "123456789",
  caller_phone: "050-1234567",
  request_for_self: true,
  self_category: "other",
  trip_type: "medical",
  source_address: "Herzl 1, Tel Aviv",
  destination_address: "Hadassah Hospital, Jerusalem",
  travel_date: "2026-06-20",
  required_arrival_time: "09:00",
  has_waiting: false,
  return_trip_required: false,
};

const VALID_OTHER_LEISURE: FormState = {
  ...EMPTY_FORM,
  caller_full_name: "Noa Levi",
  caller_id_number: "987654321",
  caller_phone: "052-9876543",
  request_for_self: false,
  passenger_full_name: "David Shapiro",
  passenger_id_number: "111222333",
  passenger_phone: "054-1112223",
  passenger_mobility_need: "wheelchair",
  passenger_category: "holocaust_survivor",
  trip_type: "leisure",
  source_address: "Ben Gurion 5, Haifa",
  destination_address: "Carmel Beach, Haifa",
  travel_date: "2026-06-21",
  leisure_window_start: "10:00",
  leisure_window_end: "16:00",
  has_waiting: false,
  return_trip_required: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// isValid
// ─────────────────────────────────────────────────────────────────────────────

describe("isValid", () => {
  it("returns true for a complete self/medical form", () => {
    expect(isValid(VALID_SELF_MEDICAL)).toBe(true);
  });

  it("returns true for a complete other-person/leisure form", () => {
    expect(isValid(VALID_OTHER_LEISURE)).toBe(true);
  });

  it("returns false for the empty form", () => {
    expect(isValid(EMPTY_FORM)).toBe(false);
  });

  // ── Caller fields ──────────────────────────────────────────────────────────

  it("returns false when caller_full_name is empty", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, caller_full_name: "" })).toBe(false);
  });

  it("returns false when caller_full_name is only whitespace", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, caller_full_name: "   " })).toBe(false);
  });

  it("returns false when caller_id_number is empty", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, caller_id_number: "" })).toBe(false);
  });

  it("returns false when caller_phone is empty", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, caller_phone: "" })).toBe(false);
  });

  it("returns false when request_for_self is null", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, request_for_self: null })).toBe(false);
  });

  // ── Self vs other-person ───────────────────────────────────────────────────

  it("returns false when self request is missing category", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, self_category: "" })).toBe(false);
  });

  it("returns false when other-person request is missing passenger name", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, passenger_full_name: "" })).toBe(false);
  });

  it("returns false when other-person request is missing passenger ID", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, passenger_id_number: "" })).toBe(false);
  });

  it("returns false when other-person request is missing passenger phone", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, passenger_phone: "" })).toBe(false);
  });

  it("returns false when other-person request is missing mobility_need", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, passenger_mobility_need: "" })).toBe(false);
  });

  it("returns false when other-person request is missing passenger category", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, passenger_category: "" })).toBe(false);
  });

  // ── Trip type ──────────────────────────────────────────────────────────────

  it("returns false when trip_type is not selected", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, trip_type: "" })).toBe(false);
  });

  // ── Trip details ───────────────────────────────────────────────────────────

  it("returns false when source_address is empty", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, source_address: "" })).toBe(false);
  });

  it("returns false when destination_address is empty", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, destination_address: "" })).toBe(false);
  });

  it("returns false when travel_date is empty", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, travel_date: "" })).toBe(false);
  });

  it("returns false for medical trip without required_arrival_time", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, required_arrival_time: "" })).toBe(false);
  });

  it("returns false for leisure trip without leisure_window_start", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, leisure_window_start: "" })).toBe(false);
  });

  it("returns false for leisure trip without leisure_window_end", () => {
    expect(isValid({ ...VALID_OTHER_LEISURE, leisure_window_end: "" })).toBe(false);
  });

  // ── Waiting ────────────────────────────────────────────────────────────────

  it("returns false when has_waiting is null", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, has_waiting: null })).toBe(false);
  });

  it("returns false when has_waiting is true but no duration selected", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, has_waiting: true, waiting_duration: "" })).toBe(false);
  });

  it("returns true when has_waiting is true with a standard duration", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, has_waiting: true, waiting_duration: "60" })).toBe(true);
  });

  it("returns false when waiting_duration is other but custom minutes is empty", () => {
    expect(isValid({
      ...VALID_SELF_MEDICAL,
      has_waiting: true,
      waiting_duration: "other",
      waiting_other_minutes: "",
    })).toBe(false);
  });

  it("returns true when waiting_duration is other and custom minutes is filled", () => {
    expect(isValid({
      ...VALID_SELF_MEDICAL,
      has_waiting: true,
      waiting_duration: "other",
      waiting_other_minutes: "45",
    })).toBe(true);
  });

  // ── Return trip ────────────────────────────────────────────────────────────

  it("returns false when return_trip_required is null", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, return_trip_required: null })).toBe(false);
  });

  it("returns true when return_trip_required is true", () => {
    expect(isValid({ ...VALID_SELF_MEDICAL, return_trip_required: true })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPayload
// ─────────────────────────────────────────────────────────────────────────────

describe("buildPayload", () => {
  it("trims whitespace from string fields", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, caller_full_name: "  Avi  ", source_address: "  Herzl 1  " });
    expect(payload.caller_full_name).toBe("Avi");
    expect(payload.source_address).toBe("Herzl 1");
  });

  it("sets request_for_self=true and category for self requests", () => {
    const payload = buildPayload(VALID_SELF_MEDICAL);
    expect(payload.request_for_self).toBe(true);
    expect(payload.category).toBe("other");
    expect(payload.passenger).toBeUndefined();
  });

  it("builds a passenger object and omits category for other-person requests", () => {
    const payload = buildPayload(VALID_OTHER_LEISURE);
    expect(payload.request_for_self).toBe(false);
    expect(payload.passenger).toEqual({
      full_name: "David Shapiro",
      national_id: "111222333",
      phone: "054-1112223",
      mobility_need: "wheelchair",
      category: "holocaust_survivor",
    });
    expect(payload.category).toBeUndefined();
  });

  it("trims whitespace from passenger fields", () => {
    const payload = buildPayload({ ...VALID_OTHER_LEISURE, passenger_full_name: "  David  " });
    expect((payload.passenger as Record<string, unknown>).full_name).toBe("David");
  });

  // ── Medical trip ───────────────────────────────────────────────────────────

  it("constructs ISO requested_arrival_at from travel_date and required_arrival_time", () => {
    const payload = buildPayload(VALID_SELF_MEDICAL);
    expect(payload.requested_arrival_at).toBe("2026-06-20T09:00:00");
  });

  it("omits estimated_departure_at when the field is empty", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, estimated_departure_time: "" });
    expect(payload.estimated_departure_at).toBeUndefined();
  });

  it("includes estimated_departure_at when the field is filled", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, estimated_departure_time: "07:30" });
    expect(payload.estimated_departure_at).toBe("2026-06-20T07:30:00");
  });

  it("does not include leisure fields for medical trips", () => {
    const payload = buildPayload(VALID_SELF_MEDICAL);
    expect(payload.leisure_window_start).toBeUndefined();
    expect(payload.leisure_window_end).toBeUndefined();
  });

  // ── Leisure trip ───────────────────────────────────────────────────────────

  it("sets leisure_window_start and leisure_window_end as HH:MM strings", () => {
    const payload = buildPayload(VALID_OTHER_LEISURE);
    expect(payload.leisure_window_start).toBe("10:00");
    expect(payload.leisure_window_end).toBe("16:00");
  });

  it("does not include medical fields for leisure trips", () => {
    const payload = buildPayload(VALID_OTHER_LEISURE);
    expect(payload.requested_arrival_at).toBeUndefined();
    expect(payload.estimated_departure_at).toBeUndefined();
  });

  // ── Waiting ────────────────────────────────────────────────────────────────

  it("omits waiting_time_minutes when has_waiting is false", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, has_waiting: false });
    expect(payload.waiting_time_minutes).toBeUndefined();
  });

  it("sets waiting_time_minutes as a number for a standard duration", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, has_waiting: true, waiting_duration: "90" });
    expect(payload.waiting_time_minutes).toBe(90);
  });

  it("parses custom minutes when waiting_duration is other", () => {
    const payload = buildPayload({
      ...VALID_SELF_MEDICAL,
      has_waiting: true,
      waiting_duration: "other",
      waiting_other_minutes: "45",
    });
    expect(payload.waiting_time_minutes).toBe(45);
  });

  // ── Service zone ───────────────────────────────────────────────────────────

  it("includes service_zone_id when provided", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, service_zone_id: "zone-uuid-123" });
    expect(payload.service_zone_id).toBe("zone-uuid-123");
  });

  it("omits service_zone_id when empty", () => {
    const payload = buildPayload({ ...VALID_SELF_MEDICAL, service_zone_id: "" });
    expect(payload.service_zone_id).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPayload → validateIntakeRideRequestInput round-trip
// Ensures the form always produces a payload the API will accept.
// ─────────────────────────────────────────────────────────────────────────────

describe("buildPayload → validateIntakeRideRequestInput round-trip", () => {
  it("produces a valid payload for a self/medical request", () => {
    const result = validateIntakeRideRequestInput(buildPayload(VALID_SELF_MEDICAL));
    expect(result.ok).toBe(true);
  });

  it("produces a valid payload for an other-person/leisure request", () => {
    const result = validateIntakeRideRequestInput(buildPayload(VALID_OTHER_LEISURE));
    expect(result.ok).toBe(true);
  });

  it("produces a valid payload when a standard waiting duration is set", () => {
    const result = validateIntakeRideRequestInput(
      buildPayload({ ...VALID_SELF_MEDICAL, has_waiting: true, waiting_duration: "60" }),
    );
    expect(result.ok).toBe(true);
  });

  it("produces a valid payload for a round-trip request", () => {
    const result = validateIntakeRideRequestInput(
      buildPayload({ ...VALID_SELF_MEDICAL, return_trip_required: true }),
    );
    expect(result.ok).toBe(true);
  });

  it("produces a valid payload including estimated_departure_at", () => {
    const result = validateIntakeRideRequestInput(
      buildPayload({ ...VALID_SELF_MEDICAL, estimated_departure_time: "07:00" }),
    );
    expect(result.ok).toBe(true);
  });

  it("produces a valid payload with a service zone", () => {
    const result = validateIntakeRideRequestInput(
      buildPayload({ ...VALID_SELF_MEDICAL, service_zone_id: "some-zone-id" }),
    );
    expect(result.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assignedDriver
// ─────────────────────────────────────────────────────────────────────────────

describe("assignedDriver", () => {
  it("returns — for an empty rides array", () => {
    expect(assignedDriver([])).toBe("—");
  });

  it("returns — when all rides are completed or rejected", () => {
    const rides: RideDriver[] = [
      { status: "completed", drivers: { users: { full_name: "Avi Cohen" } } },
      { status: "rejected", drivers: { users: { full_name: "Noa Levi" } } },
    ];
    expect(assignedDriver(rides)).toBe("—");
  });

  it("returns the driver name for an assigned ride", () => {
    const rides: RideDriver[] = [
      { status: "assigned", drivers: { users: { full_name: "Yossi Mizrahi" } } },
    ];
    expect(assignedDriver(rides)).toBe("Yossi Mizrahi");
  });

  it("returns the driver name for an in_progress ride", () => {
    const rides: RideDriver[] = [
      { status: "in_progress", drivers: { users: { full_name: "Dana Shapiro" } } },
    ];
    expect(assignedDriver(rides)).toBe("Dana Shapiro");
  });

  it("picks the active ride when a completed ride also exists", () => {
    const rides: RideDriver[] = [
      { status: "completed", drivers: { users: { full_name: "Old Driver" } } },
      { status: "assigned", drivers: { users: { full_name: "Eran Peretz" } } },
    ];
    expect(assignedDriver(rides)).toBe("Eran Peretz");
  });

  it("returns — when drivers is null", () => {
    const rides: RideDriver[] = [{ status: "assigned", drivers: null }];
    expect(assignedDriver(rides)).toBe("—");
  });

  it("returns — when users is null on the driver object", () => {
    const rides: RideDriver[] = [
      { status: "assigned", drivers: { users: null } as { users: null } },
    ];
    expect(assignedDriver(rides)).toBe("—");
  });

  it("handles the Supabase array format (TS-inferred shape)", () => {
    const rides: RideDriver[] = [
      { status: "assigned", drivers: [{ users: [{ full_name: "Avi Cohen" }] }] },
    ];
    expect(assignedDriver(rides)).toBe("Avi Cohen");
  });
});
