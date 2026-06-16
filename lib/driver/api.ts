import type {
  ApiErrorPayload,
  DriverApiError,
  DriverRideDetail,
  DriverRidesResponse,
  DriverSession,
  RideSummary,
} from "@/lib/driver/types";

type JsonBody = Record<string, unknown>;

export function userMessageForStatus(status: number, fallback: string): string {
  if (status === 401) return "Your session expired. Log in again to continue.";
  if (status === 403) return "You do not have permission to perform this driver action.";
  if (status === 409) return "This ride changed while you were working. Refresh and try again.";
  if (status === 404) return "This ride could not be found. It may have been removed or reassigned.";
  if (status === 422) return fallback || "Check the odometer and ride status, then try again.";
  if (status >= 500) return "The server had a problem. Wait a moment and try again.";
  return fallback || "Something went wrong. Try again.";
}

function isRideAssignmentConflict(path: string, status: number, fallback: string) {
  if (path !== "/api/rides" || status !== 409) return false;

  const message = fallback.toLowerCase();
  return (
    message.includes("active assignment") ||
    message.includes("already accepted") ||
    message.includes("already taken") ||
    message.includes("no longer open for assignment")
  );
}

async function readError(path: string, response: Response): Promise<DriverApiError> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = {};
  }

  const fallback = payload.message || payload.error || response.statusText;
  const detail = isRideAssignmentConflict(path, response.status, fallback)
    ? "This ride was already accepted by another driver"
    : userMessageForStatus(response.status, fallback);

  return {
    status: response.status,
    title: response.statusText || "Request failed",
    detail,
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw {
      status: 0,
      title: "Network error",
      detail: "Network connection failed. Check your connection and try again.",
    } satisfies DriverApiError;
  }

  if (!response.ok) {
    throw await readError(path, response);
  }

  return (await response.json()) as T;
}

function driverAuthHeaders(session: DriverSession): HeadersInit {
  if (!session.token) return {};
  return { Authorization: `Bearer ${session.token}` };
}

export async function loginDriver(email: string, password: string): Promise<DriverSession> {
  return requestJson<DriverSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getDriverRides(session: DriverSession): Promise<DriverRidesResponse> {
  const rides = await requestJson<DriverRidesResponse>("/api/driver/rides", {
    headers: driverAuthHeaders(session),
  });

  return {
    openRides: rides.openRides.filter((ride) => ride.status === "approved"),
    assignedRides: rides.assignedRides.filter(
      (ride) => ride.status === "assigned" || ride.status === "in_progress",
    ),
    rideHistory: rides.rideHistory.filter((ride) => ride.status === "completed"),
  };
}

export async function getDriverRideDetail(
  id: string,
  session: DriverSession,
): Promise<DriverRideDetail> {
  return requestJson<DriverRideDetail>(`/api/driver/rides/${id}`, {
    headers: driverAuthHeaders(session),
  });
}

async function getAvailableAmbulanceId(session: DriverSession): Promise<string> {
  const availability = await requestJson<{
    ambulances: Array<{ id: string; service_zone_id: string | null }>;
  }>("/api/availability", {
    headers: driverAuthHeaders(session),
  });

  const zoneMatch = availability.ambulances.find(
    (ambulance) => session.serviceZoneId && ambulance.service_zone_id === session.serviceZoneId,
  );
  const fallback = availability.ambulances[0];
  const selected = zoneMatch ?? fallback;

  if (!selected) {
    throw {
      status: 409,
      title: "No ambulance available",
      detail: "No ambulance is available for this ride right now.",
    } satisfies DriverApiError;
  }

  return selected.id;
}

export async function acceptOpenRide(input: {
  rideRequestId: string;
  session: DriverSession;
}): Promise<RideSummary> {
  const ambulanceId = await getAvailableAmbulanceId(input.session);

  return requestJson<RideSummary>("/api/rides", {
    method: "POST",
    headers: driverAuthHeaders(input.session),
    body: JSON.stringify({
      ride_request_id: input.rideRequestId,
      ambulance_id: ambulanceId,
    }),
  });
}

export async function updateRideStatus(input: {
  rideId: string;
  status: "in_progress" | "completed" | "rejected";
  rejectionReason?: string;
  session: DriverSession;
}): Promise<RideSummary> {
  const body: JsonBody = { status: input.status };
  if (input.rejectionReason) body.rejection_reason = input.rejectionReason;

  return requestJson<RideSummary>(`/api/rides/${input.rideId}/status`, {
    method: "PATCH",
    headers: driverAuthHeaders(input.session),
    body: JSON.stringify(body),
  });
}

export async function updateRideOdometer(input: {
  rideId: string;
  odometerStartKm?: number;
  odometerEndKm?: number;
  session: DriverSession;
}): Promise<RideSummary> {
  return requestJson<RideSummary>(`/api/rides/${input.rideId}`, {
    method: "PATCH",
    headers: driverAuthHeaders(input.session),
    body: JSON.stringify({
      odometer_start_km: input.odometerStartKm,
      odometer_end_km: input.odometerEndKm,
    }),
  });
}

export async function completeRide(input: {
  rideId: string;
  odometerStartKm?: number;
  odometerEndKm: number;
  session: DriverSession;
}): Promise<RideSummary> {
  return requestJson<RideSummary>(`/api/rides/${input.rideId}/status`, {
    method: "PATCH",
    headers: driverAuthHeaders(input.session),
    body: JSON.stringify({
      status: "completed",
      odometer_start_km: input.odometerStartKm,
      odometer_end_km: input.odometerEndKm,
    }),
  });
}
