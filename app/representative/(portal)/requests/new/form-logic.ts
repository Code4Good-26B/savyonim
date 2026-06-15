import type { MobilityNeed, PassengerCategory, TripType } from "@/lib/intake-contract";

export type FormState = {
  caller_full_name: string;
  caller_id_number: string;
  caller_phone: string;
  request_for_self: boolean | null;

  passenger_full_name: string;
  passenger_id_number: string;
  passenger_phone: string;
  passenger_mobility_need: MobilityNeed | "";
  passenger_category: PassengerCategory | "";

  self_category: PassengerCategory | "";

  trip_type: TripType | "";

  source_address: string;
  destination_address: string;
  travel_date: string;
  required_arrival_time: string;
  estimated_departure_time: string;
  leisure_window_start: string;
  leisure_window_end: string;

  has_waiting: boolean | null;
  waiting_duration: string;
  waiting_other_minutes: string;

  return_trip_required: boolean | null;
  service_zone_id: string;
};

export const EMPTY_FORM: FormState = {
  caller_full_name: "",
  caller_id_number: "",
  caller_phone: "",
  request_for_self: null,
  passenger_full_name: "",
  passenger_id_number: "",
  passenger_phone: "",
  passenger_mobility_need: "",
  passenger_category: "",
  self_category: "",
  trip_type: "",
  source_address: "",
  destination_address: "",
  travel_date: "",
  required_arrival_time: "",
  estimated_departure_time: "",
  leisure_window_start: "",
  leisure_window_end: "",
  has_waiting: null,
  waiting_duration: "",
  waiting_other_minutes: "",
  return_trip_required: null,
  service_zone_id: "",
};

export function isValid(f: FormState): boolean {
  if (!f.caller_full_name.trim() || !f.caller_id_number.trim() || !f.caller_phone.trim()) return false;
  if (f.request_for_self === null) return false;

  if (f.request_for_self === false) {
    if (!f.passenger_full_name.trim() || !f.passenger_id_number.trim() || !f.passenger_phone.trim()) return false;
    if (!f.passenger_mobility_need || !f.passenger_category) return false;
  } else {
    if (!f.self_category) return false;
  }

  if (!f.trip_type) return false;
  if (!f.source_address.trim() || !f.destination_address.trim() || !f.travel_date) return false;

  if (f.trip_type === "medical" && !f.required_arrival_time) return false;
  if (f.trip_type === "leisure" && (!f.leisure_window_start || !f.leisure_window_end)) return false;

  if (f.has_waiting === null) return false;
  if (f.has_waiting) {
    if (!f.waiting_duration) return false;
    if (f.waiting_duration === "other" && !f.waiting_other_minutes.trim()) return false;
  }

  if (f.return_trip_required === null) return false;

  return true;
}

export function buildPayload(f: FormState): Record<string, unknown> {
  const toISO = (date: string, time: string) => `${date}T${time}:00`;

  const payload: Record<string, unknown> = {
    caller_full_name: f.caller_full_name.trim(),
    caller_id_number: f.caller_id_number.trim(),
    caller_phone: f.caller_phone.trim(),
    request_for_self: f.request_for_self!,
    trip_type: f.trip_type,
    source_address: f.source_address.trim(),
    destination_address: f.destination_address.trim(),
    return_trip_required: f.return_trip_required!,
  };

  if (f.request_for_self) {
    payload.category = f.self_category;
  } else {
    payload.passenger = {
      full_name: f.passenger_full_name.trim(),
      national_id: f.passenger_id_number.trim(),
      phone: f.passenger_phone.trim(),
      mobility_need: f.passenger_mobility_need,
      category: f.passenger_category,
    };
  }

  if (f.trip_type === "medical") {
    payload.requested_arrival_at = toISO(f.travel_date, f.required_arrival_time);
    if (f.estimated_departure_time) {
      payload.estimated_departure_at = toISO(f.travel_date, f.estimated_departure_time);
    }
  } else if (f.trip_type === "leisure") {
    payload.leisure_window_start = f.leisure_window_start;
    payload.leisure_window_end = f.leisure_window_end;
  }

  if (f.has_waiting) {
    payload.waiting_time_minutes =
      f.waiting_duration === "other"
        ? parseInt(f.waiting_other_minutes, 10)
        : parseInt(f.waiting_duration, 10);
  }

  if (f.service_zone_id) payload.service_zone_id = f.service_zone_id;

  return payload;
}
