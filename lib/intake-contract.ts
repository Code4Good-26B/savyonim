export const TRIP_TYPES = ["medical", "leisure"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const MOBILITY_NEEDS = ["walking", "wheelchair", "walker", "cane"] as const;
export type MobilityNeed = (typeof MOBILITY_NEEDS)[number];

export const PASSENGER_CATEGORIES = [
  "wounded_soldier",
  "idf_disabled",
  "holocaust_survivor",
  "cancer_patient",
  "dialysis_patient",
  "other",
] as const;
export type PassengerCategory = (typeof PASSENGER_CATEGORIES)[number];

export type IntakePassengerInput = {
  full_name: string;
  national_id: string;
  phone: string;
  emergency_contact?: string;
  mobility_need: MobilityNeed;
  category: PassengerCategory;
};

export type IntakeRideRequestInput = {
  caller_full_name: string;
  caller_id_number: string;
  caller_phone: string;
  request_for_self: boolean;
  passenger?: IntakePassengerInput;
  category?: PassengerCategory;
  trip_type: TripType;
  source_address: string;
  destination_address: string;
  requested_pickup_at?: string;
  requested_arrival_at?: string;
  estimated_departure_at?: string;
  waiting_time_minutes?: number | null;
  leisure_window_start?: string;
  leisure_window_end?: string;
  return_trip_required: boolean;
  service_zone_id?: string;
};

type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(value: unknown, fieldName: string): ValidationSuccess<string> | ValidationFailure {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `${fieldName} is required` };
  }

  return { ok: true, data: value.trim() };
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredBoolean(value: unknown, fieldName: string): ValidationSuccess<boolean> | ValidationFailure {
  if (typeof value !== "boolean") {
    return { ok: false, error: `${fieldName} must be true or false` };
  }

  return { ok: true, data: value };
}

function readTripType(value: unknown): ValidationSuccess<TripType> | ValidationFailure {
  if (value === "medical" || value === "leisure") {
    return { ok: true, data: value };
  }

  return { ok: false, error: `trip_type must be one of: ${TRIP_TYPES.join(", ")}` };
}

function readPassengerCategory(
  value: unknown,
  fieldName: string,
): ValidationSuccess<PassengerCategory> | ValidationFailure {
  if (typeof value !== "string" || !PASSENGER_CATEGORIES.includes(value as PassengerCategory)) {
    return { ok: false, error: `${fieldName} must be one of: ${PASSENGER_CATEGORIES.join(", ")}` };
  }

  return { ok: true, data: value as PassengerCategory };
}

function readMobilityNeed(value: unknown): ValidationSuccess<MobilityNeed> | ValidationFailure {
  if (typeof value !== "string" || !MOBILITY_NEEDS.includes(value as MobilityNeed)) {
    return { ok: false, error: `passenger.mobility_need must be one of: ${MOBILITY_NEEDS.join(", ")}` };
  }

  return { ok: true, data: value as MobilityNeed };
}

function readOptionalPositiveInteger(value: unknown, fieldName: string): ValidationSuccess<number | null | undefined> | ValidationFailure {
  if (value === undefined || value === null) {
    return { ok: true, data: value as null | undefined };
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return { ok: false, error: `${fieldName} must be a positive integer` };
  }

  return { ok: true, data: value };
}

function isValidIsoDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours * 60) + minutes;
}

function validatePassenger(input: unknown): ValidationSuccess<IntakePassengerInput> | ValidationFailure {
  if (!isRecord(input)) {
    return { ok: false, error: "passenger is required when request_for_self is false" };
  }

  const fullName = readRequiredString(input.full_name, "passenger.full_name");
  if (!fullName.ok) return fullName;

  const nationalId = readRequiredString(input.national_id, "passenger.national_id");
  if (!nationalId.ok) return nationalId;

  const phone = readRequiredString(input.phone, "passenger.phone");
  if (!phone.ok) return phone;

  const mobilityNeed = readMobilityNeed(input.mobility_need);
  if (!mobilityNeed.ok) return mobilityNeed;

  const category = readPassengerCategory(input.category, "passenger.category");
  if (!category.ok) return category;

  return {
    ok: true,
    data: {
      full_name: fullName.data,
      national_id: nationalId.data,
      phone: phone.data,
      emergency_contact: readOptionalString(input.emergency_contact),
      mobility_need: mobilityNeed.data,
      category: category.data,
    },
  };
}

export function validateIntakeRideRequestInput(
  input: unknown,
): ValidationSuccess<IntakeRideRequestInput> | ValidationFailure {
  if (!isRecord(input)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const callerFullName = readRequiredString(input.caller_full_name, "caller_full_name");
  if (!callerFullName.ok) return callerFullName;

  const callerIdNumber = readRequiredString(input.caller_id_number, "caller_id_number");
  if (!callerIdNumber.ok) return callerIdNumber;

  const callerPhone = readRequiredString(input.caller_phone, "caller_phone");
  if (!callerPhone.ok) return callerPhone;

  const requestForSelf = readRequiredBoolean(input.request_for_self, "request_for_self");
  if (!requestForSelf.ok) return requestForSelf;

  const tripType = readTripType(input.trip_type);
  if (!tripType.ok) return tripType;

  const sourceAddress = readRequiredString(input.source_address, "source_address");
  if (!sourceAddress.ok) return sourceAddress;

  const destinationAddress = readRequiredString(input.destination_address, "destination_address");
  if (!destinationAddress.ok) return destinationAddress;

  const returnTripRequired = readRequiredBoolean(input.return_trip_required, "return_trip_required");
  if (!returnTripRequired.ok) return returnTripRequired;

  const waitingTime = readOptionalPositiveInteger(input.waiting_time_minutes, "waiting_time_minutes");
  if (!waitingTime.ok) return waitingTime;

  const requestedArrivalAt = readOptionalString(input.requested_arrival_at);
  const estimatedDepartureAt = readOptionalString(input.estimated_departure_at);
  const leisureWindowStart = readOptionalString(input.leisure_window_start);
  const leisureWindowEnd = readOptionalString(input.leisure_window_end);

  if (requestedArrivalAt && !isValidIsoDateTime(requestedArrivalAt)) {
    return { ok: false, error: "requested_arrival_at must be a valid ISO timestamp" };
  }

  if (estimatedDepartureAt && !isValidIsoDateTime(estimatedDepartureAt)) {
    return { ok: false, error: "estimated_departure_at must be a valid ISO timestamp" };
  }

  if (tripType.data === "medical" && !requestedArrivalAt) {
    return { ok: false, error: "requested_arrival_at is required for medical trips" };
  }

  if (tripType.data === "leisure") {
    if (!leisureWindowStart || !leisureWindowEnd) {
      return { ok: false, error: "leisure_window_start and leisure_window_end are required for leisure trips" };
    }

    if (!isValidHHMM(leisureWindowStart) || !isValidHHMM(leisureWindowEnd)) {
      return { ok: false, error: "leisure_window_start and leisure_window_end must use HH:MM format" };
    }

    if (parseMinutes(leisureWindowEnd) <= parseMinutes(leisureWindowStart)) {
      return { ok: false, error: "leisure_window_end must be after leisure_window_start" };
    }
  }

  let passenger: IntakePassengerInput | undefined;
  let category: PassengerCategory | undefined;

  if (requestForSelf.data) {
    const selfCategory = readPassengerCategory(input.category, "category");
    if (!selfCategory.ok) return selfCategory;
    category = selfCategory.data;
  } else {
    const passengerValidation = validatePassenger(input.passenger);
    if (!passengerValidation.ok) return passengerValidation;
    passenger = passengerValidation.data;
  }

  const requestedPickupAt = readOptionalString(input.requested_pickup_at);
  if (requestedPickupAt && !isValidIsoDateTime(requestedPickupAt)) {
    return { ok: false, error: "requested_pickup_at must be a valid ISO timestamp" };
  }

  return {
    ok: true,
    data: {
      caller_full_name: callerFullName.data,
      caller_id_number: callerIdNumber.data,
      caller_phone: callerPhone.data,
      request_for_self: requestForSelf.data,
      passenger,
      category,
      trip_type: tripType.data,
      source_address: sourceAddress.data,
      destination_address: destinationAddress.data,
      requested_pickup_at: requestedPickupAt,
      requested_arrival_at: requestedArrivalAt,
      estimated_departure_at: estimatedDepartureAt,
      waiting_time_minutes: waitingTime.data ?? undefined,
      leisure_window_start: leisureWindowStart,
      leisure_window_end: leisureWindowEnd,
      return_trip_required: returnTripRequired.data,
      service_zone_id: readOptionalString(input.service_zone_id),
    },
  };
}
