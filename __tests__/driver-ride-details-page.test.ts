import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DriverI18nProvider } from "@/components/driver/DriverI18n";
import { RideRequestDetails } from "@/app/driver/rides/[id]/page";
import type { RideRequestSummary } from "@/lib/driver/types";

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

    expect(html).toContain("Passenger information");
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
