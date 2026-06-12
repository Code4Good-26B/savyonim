export type ServiceZone = {
  id: string;
  name: string;
  region_code: string;
};

export type SavedDestination = {
  id: string;
  label: string;
  street: string;
  city: string;
};

export type PastRide = {
  id: string;
  date: string;
  source: string;
  destination: string;
  status: RideStatus;
  passenger_name?: string;
  driver_name?: string;
};

export const MOCK_SAVED_DESTINATIONS: SavedDestination[] = [
  { id: "d1", label: "בית", street: "רחוב הרצל 5", city: "תל אביב" },
  { id: "d2", label: "עבודה", street: "שדרות רוטשילד 22", city: "תל אביב" },
];

export const MOCK_PAST_RIDES: PastRide[] = [
  { id: "pr1", date: "2026-05-10T09:00:00.000Z", source: "רחוב הרצל 5, תל אביב", destination: "בית חולים איכילוב, תל אביב", status: "completed", passenger_name: "מרים כץ", driver_name: "דוד אברמוב" },
  { id: "pr2", date: "2026-05-03T14:00:00.000Z", source: "רחוב הרצל 5, תל אביב", destination: "מרפאה מאוחדת, תל אביב", status: "completed", passenger_name: "יוסף אוחיון", driver_name: "אלי שפירא" },
  { id: "pr3", date: "2026-04-28T10:30:00.000Z", source: "שדרות רוטשילד 22, תל אביב", destination: "בית חולים איכילוב, תל אביב", status: "rejected", passenger_name: "רחל גולן" },
  { id: "pr4", date: "2026-04-15T08:00:00.000Z", source: "רחוב הרצל 5, תל אביב", destination: "מרכז רפואי סורסקי, תל אביב", status: "completed", passenger_name: "אברהם שמש", driver_name: "יוסי כהן" },
];

export const MOCK_SERVICE_ZONES: ServiceZone[] = [
  { id: "11111111-0000-0000-0000-000000000001", name: "North Tel Aviv", region_code: "TLV-N" },
  { id: "11111111-0000-0000-0000-000000000002", name: "Central Tel Aviv", region_code: "TLV-C" },
  { id: "11111111-0000-0000-0000-000000000003", name: "South Tel Aviv", region_code: "TLV-S" },
];

export type RideStatus =
  | "pending"
  | "approved"
  | "waiting_for_representative"
  | "in_progress"
  | "completed"
  | "rejected";

export type MobilityNeed = "walking" | "wheelchair" | "walker" | "cane";

export type PassengerCategory =
  | "wounded_soldier"
  | "idf_disabled"
  | "holocaust_survivor"
  | "cancer_patient"
  | "dialysis_patient"
  | "other";

export type Passenger = {
  id: string;
  full_name: string;
  phone: string;
  national_id?: string;
  category: PassengerCategory;
  mobility_need: MobilityNeed;
  mobility_notes?: string;
  emergency_contact?: string;
};

export type RideRequest = {
  id: string;
  passenger: Passenger;
  status: RideStatus;
  source_address: string;
  destination_address: string;
  return_trip_required: boolean;
  requested_pickup_at: string;
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
  assigned_driver_name?: string;
  rejection_reason?: string;
};

export const MOCK_PASSENGERS: Passenger[] = [
  { id: "p1", full_name: "מרים כץ", phone: "050-1111111", mobility_need: "walker", category: "other" },
  { id: "p2", full_name: "יוסף לוי", phone: "052-2222222", mobility_need: "wheelchair", mobility_notes: "זקוק לעזרה בעלייה לרכב", category: "idf_disabled" },
  { id: "p3", full_name: "שרה כהן", phone: "054-3333333", mobility_need: "walking", category: "dialysis_patient" },
  { id: "p4", full_name: "אברהם ישראל", phone: "050-4444444", mobility_need: "cane", category: "holocaust_survivor" },
  { id: "p5", full_name: "רחל גולדברג", phone: "053-5555555", mobility_need: "walking", category: "wounded_soldier" },
];

export const MOCK_RIDE_REQUESTS: RideRequest[] = [
  {
    id: "rr1",
    passenger: MOCK_PASSENGERS[0],
    status: "pending",
    source_address: "רחוב הרצל 5, תל אביב",
    destination_address: "בית חולים איכילוב, תל אביב",
    return_trip_required: true,
    requested_pickup_at: "2026-06-02T09:00:00.000Z",
    caller_full_name: null,
    caller_id_number: null,
    caller_phone: null,
    request_for_self: false,
    trip_type: null,
    requested_arrival_at: null,
    estimated_departure_at: null,
    waiting_time_minutes: null,
    leisure_window_start: null,
    leisure_window_end: null,
  },
  {
    id: "rr2",
    passenger: MOCK_PASSENGERS[1],
    status: "approved",
    source_address: "שדרות בן גוריון 12, חיפה",
    destination_address: "מרפאה מאוחדת, חיפה",
    return_trip_required: false,
    requested_pickup_at: "2026-06-02T10:30:00.000Z",
    caller_full_name: null,
    caller_id_number: null,
    caller_phone: null,
    request_for_self: false,
    trip_type: null,
    requested_arrival_at: null,
    estimated_departure_at: null,
    waiting_time_minutes: null,
    leisure_window_start: null,
    leisure_window_end: null,
  },
  {
    id: "rr3",
    passenger: MOCK_PASSENGERS[2],
    status: "in_progress",
    source_address: "רחוב יפו 3, ירושלים",
    destination_address: "הדסה עין כרם, ירושלים",
    return_trip_required: true,
    requested_pickup_at: "2026-06-02T08:00:00.000Z",
    caller_full_name: null,
    caller_id_number: null,
    caller_phone: null,
    request_for_self: false,
    trip_type: null,
    requested_arrival_at: null,
    estimated_departure_at: null,
    waiting_time_minutes: null,
    leisure_window_start: null,
    leisure_window_end: null,
    assigned_driver_name: "דוד אברמוב",
  },
  {
    id: "rr4",
    passenger: MOCK_PASSENGERS[3],
    status: "completed",
    source_address: "רחוב ביאליק 7, רמת גן",
    destination_address: "שיבא תל השומר, רמת גן",
    return_trip_required: false,
    requested_pickup_at: "2026-06-01T14:00:00.000Z",
    caller_full_name: null,
    caller_id_number: null,
    caller_phone: null,
    request_for_self: false,
    trip_type: null,
    requested_arrival_at: null,
    estimated_departure_at: null,
    waiting_time_minutes: null,
    leisure_window_start: null,
    leisure_window_end: null,
    assigned_driver_name: "אלי שפירא",
  },
  {
    id: "rr5",
    passenger: MOCK_PASSENGERS[4],
    status: "rejected",
    source_address: "רחוב רוטשילד 20, תל אביב",
    destination_address: "מרכז רפואי סורסקי, תל אביב",
    return_trip_required: false,
    requested_pickup_at: "2026-06-01T11:00:00.000Z",
    caller_full_name: null,
    caller_id_number: null,
    caller_phone: null,
    request_for_self: false,
    trip_type: null,
    requested_arrival_at: null,
    estimated_departure_at: null,
    waiting_time_minutes: null,
    leisure_window_start: null,
    leisure_window_end: null,
    rejection_reason: "לא נמצא נהג זמין",
  },
];
