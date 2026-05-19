type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; error: string };

export type RideRequestWebhookPayload = {
  request_id: string;
  service_zone: {
    id?: string;
    region_code?: string;
  };
  passenger: {
    full_name: string;
    phone: string;
    national_id?: string;
    emergency_contact?: string;
    mobility_need?: "none" | "wheelchair" | "walker" | "cane";
    category?: string;
  };
  trip: {
    source_address: string;
    destination_address: string;
    source_notes?: string;
    destination_notes?: string;
    return_trip_required?: boolean;
    requested_pickup_at?: string;
  };
  metadata?: {
    channel?: string;
    representative_user_id?: string;
  };
};

export type DriverLocationUpdateWebhookPayload = {
  driver_id: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
  ride_id?: string;
  accuracy_meters?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function isValidIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function readMobilityNeed(
  value: unknown,
): "none" | "wheelchair" | "walker" | "cane" | undefined {
  const mobilityNeed = readString(value);
  if (!mobilityNeed) {
    return undefined;
  }

  if (["none", "wheelchair", "walker", "cane"].includes(mobilityNeed)) {
    return mobilityNeed as "none" | "wheelchair" | "walker" | "cane";
  }

  return undefined;
}

export function validateRideRequestWebhookPayload(
  input: unknown,
): ValidationSuccess<RideRequestWebhookPayload> | ValidationFailure {
  if (!isRecord(input)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const requestId = readString(input.request_id);
  if (!requestId) {
    return { ok: false, error: "request_id is required" };
  }

  if (!isRecord(input.service_zone)) {
    return { ok: false, error: "service_zone is required" };
  }

  const serviceZoneId = readString(input.service_zone.id);
  const regionCode = readString(input.service_zone.region_code);
  if (!serviceZoneId && !regionCode) {
    return { ok: false, error: "service_zone.id or service_zone.region_code is required" };
  }

  if (!isRecord(input.passenger)) {
    return { ok: false, error: "passenger is required" };
  }

  const fullName = readString(input.passenger.full_name);
  if (!fullName) {
    return { ok: false, error: "passenger.full_name is required" };
  }

  const phone = readString(input.passenger.phone);
  if (!phone) {
    return { ok: false, error: "passenger.phone is required" };
  }

  if (!isRecord(input.trip)) {
    return { ok: false, error: "trip is required" };
  }

  const sourceAddress = readString(input.trip.source_address);
  if (!sourceAddress) {
    return { ok: false, error: "trip.source_address is required" };
  }

  const destinationAddress = readString(input.trip.destination_address);
  if (!destinationAddress) {
    return { ok: false, error: "trip.destination_address is required" };
  }

  const requestedPickupAt = readString(input.trip.requested_pickup_at);
  if (requestedPickupAt && !isValidIsoDate(requestedPickupAt)) {
    return { ok: false, error: "trip.requested_pickup_at must be a valid timestamp" };
  }

  const payload: RideRequestWebhookPayload = {
    request_id: requestId,
    service_zone: {
      id: serviceZoneId ?? undefined,
      region_code: regionCode ?? undefined,
    },
    passenger: {
      full_name: fullName,
      phone,
      national_id: readString(input.passenger.national_id) ?? undefined,
      emergency_contact: readString(input.passenger.emergency_contact) ?? undefined,
      mobility_need: readMobilityNeed(input.passenger.mobility_need),
      category: readString(input.passenger.category) ?? undefined,
    },
    trip: {
      source_address: sourceAddress,
      destination_address: destinationAddress,
      source_notes: readString(input.trip.source_notes) ?? undefined,
      destination_notes: readString(input.trip.destination_notes) ?? undefined,
      return_trip_required: readBoolean(input.trip.return_trip_required),
      requested_pickup_at: requestedPickupAt ?? undefined,
    },
    metadata: isRecord(input.metadata)
      ? {
          channel: readString(input.metadata.channel) ?? undefined,
          representative_user_id: readString(input.metadata.representative_user_id) ?? undefined,
        }
      : undefined,
  };

  return { ok: true, data: payload };
}

export function validateDriverLocationUpdateWebhookPayload(
  input: unknown,
): ValidationSuccess<DriverLocationUpdateWebhookPayload> | ValidationFailure {
  if (!isRecord(input)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const driverId = readString(input.driver_id);
  if (!driverId) {
    return { ok: false, error: "driver_id is required" };
  }

  const latitude = readOptionalNumber(input.latitude);
  if (latitude === undefined || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, error: "latitude must be a number between -90 and 90" };
  }

  const longitude = readOptionalNumber(input.longitude);
  if (longitude === undefined || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: "longitude must be a number between -180 and 180" };
  }

  const recordedAt = readString(input.recorded_at);
  if (recordedAt && !isValidIsoDate(recordedAt)) {
    return { ok: false, error: "recorded_at must be a valid timestamp" };
  }

  const accuracyMeters = readOptionalNumber(input.accuracy_meters);
  if (accuracyMeters !== undefined && (Number.isNaN(accuracyMeters) || accuracyMeters < 0)) {
    return { ok: false, error: "accuracy_meters must be a non-negative number" };
  }

  return {
    ok: true,
    data: {
      driver_id: driverId,
      latitude,
      longitude,
      recorded_at: recordedAt ?? undefined,
      ride_id: readString(input.ride_id) ?? undefined,
      accuracy_meters: accuracyMeters,
    },
  };
}
