import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DriverI18nProvider } from "@/components/driver/DriverI18n";
import { RideRequestDetails } from "@/app/driver/rides/[id]/page";
import { AssignedRideActions } from "@/components/driver/RideActions";
import type { DriverSession, RideRequestSummary, RideSummary } from "@/lib/driver/types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "ride-request-1" }),
  useRouter: () => ({ replace: vi.fn() }),
}));

const baseRide: RideRequestSummary = {
  id: "99999999-0000-0000-0000-000000000001",
  passenger_id: "55555555-0000-0000-0000-000000000001",
  requested_by_user_id: null,
  service_zone_id: "11111111-0000-0000-0000-000000000001",
  status: "approved",
  source_address: "12 Arlozorov Street, Tel Aviv",
  source_notes: "Meet at the main lobby entrance",
  destination_address: "Ichilov Hospital, Tel Aviv",
  destination_notes: null,
  return_trip_required: false,
  requested_pickup_at: "2026-06-05T09:00:00.000Z",
  caller_full_name: "Miriam Katz",
  caller_id_number: "111111111",
  caller_phone: "050-1111111",
  request_for_self: true,
  trip_type: "medical",
  requested_arrival_at: "2026-06-05T10:00:00.000Z",
  estimated_departure_at: null,
  waiting_time_minutes: 30,
  leisure_window_start: null,
  leisure_window_end: null,
};

function renderDetails(ride: RideRequestSummary) {
  return renderToStaticMarkup(
    React.createElement(
      DriverI18nProvider,
      null,
      React.createElement(RideRequestDetails, { ride }),
    ),
  );
}

const assignedRide: RideSummary = {
  id: "77777777-0000-0000-0000-000000000001",
  ride_request_id: baseRide.id,
  driver_id: "33333333-0000-0000-0000-000000000001",
  ambulance_id: "44444444-0000-0000-0000-000000000001",
  assigned_by_user_id: "22222222-0000-0000-0000-000000000001",
  representative_user_id: null,
  status: "assigned",
  assigned_at: "2026-06-05T09:00:00.000Z",
  in_progress_at: null,
  completed_at: null,
  rejected_at: null,
  rejection_reason: null,
  odometer_start_km: null,
  odometer_end_km: null,
  ride_request: baseRide,
};

const session: DriverSession = {
  userId: "22222222-0000-0000-0000-000000000001",
  driverId: "33333333-0000-0000-0000-000000000001",
  fullName: "Driver One",
  email: "driver@example.test",
  role: "driver",
  serviceZoneId: baseRide.service_zone_id,
  token: "driver-token",
  expiresAt: "2026-06-06T09:00:00.000Z",
};

function renderAssignedActions(ride: RideSummary) {
  return renderToStaticMarkup(
    React.createElement(
      DriverI18nProvider,
      null,
      React.createElement(AssignedRideActions, {
        ride,
        session,
        onChanged: vi.fn(),
      }),
    ),
  );
}

describe("driver ride details page passenger rendering", () => {
  it("renders passenger information when available", () => {
    const html = renderDetails({
      ...baseRide,
      passenger: {
        id: "55555555-0000-0000-0000-000000000001",
        full_name: "Miriam Katz",
        phone: "050-1111111",
        emergency_contact: "050-9991111",
        mobility_need: "walking",
        category: "other",
      },
    });

    expect(html).toContain("Miriam Katz");
    expect(html).toContain("050-1111111");
    expect(html).toContain("050-9991111");
    expect(html).toContain("walking");
  });

  it("renders a clear fallback when passenger information is missing", () => {
    const html = renderDetails({ ...baseRide, passenger: null });

    expect(html).toContain("Passenger information is not available for this ride.");
    expect(html).not.toContain("Miriam Katz");
  });
});

describe("driver assigned ride actions", () => {
  it("renders Complete ride for an assigned ride and does not render Start ride", () => {
    const html = renderAssignedActions(assignedRide);

    expect(html).toContain("Complete ride");
    expect(html).not.toContain("Start ride");
  });
});
