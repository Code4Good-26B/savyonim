export type DriverSession = {
  userId: string;
  driverId: string;
  fullName: string;
  email: string;
  role: "driver";
  serviceZoneId: string | null;
  token?: string;
  expiresAt?: string;
};

export type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type RideRequestSummary = {
  id: string;
  passenger_id: string;
  requested_by_user_id: string | null;
  service_zone_id: string | null;
  status: string;
  source_address: string;
  source_notes: string | null;
  destination_address: string;
  destination_notes: string | null;
  return_trip_required: boolean;
  requested_pickup_at: string | null;
  caller_full_name: string | null;
  caller_id_number: string | null;
  caller_phone: string | null;
  request_for_self: boolean;
  trip_type: "medical" | "leisure" | null;
  requested_arrival_at: string | null;
  estimated_departure_at: string | null;
  waiting_time_minutes: number | null;
  leisure_window_start: string | null;
  leisure_window_end: string | null;
  approved_at?: string | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  passenger?: PassengerSummary | null;
};

export type PassengerSummary = {
  id: string;
  full_name: string;
  phone: string | null;
  emergency_contact: string | null;
  mobility_need: string;
  category: string | null;
};

export type RideSummary = {
  id: string;
  ride_request_id: string;
  driver_id: string;
  ambulance_id: string;
  assigned_by_user_id: string | null;
  representitive_user_id: string | null;
  status: "assigned" | "in_progress" | "completed" | "rejected";
  assigned_at: string | null;
  in_progress_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  odometer_start_km: number | null;
  odometer_end_km: number | null;
  ride_request?: RideRequestSummary | null;
};

export type DriverRidesResponse = {
  openRides: RideRequestSummary[];
  assignedRides: RideSummary[];
  rideHistory: RideSummary[];
};

export type DriverRideDetail =
  | { kind: "open"; rideRequest: RideRequestSummary }
  | { kind: "assigned"; ride: RideSummary };

export type DriverApiError = {
  status: number;
  title: string;
  detail: string;
};
