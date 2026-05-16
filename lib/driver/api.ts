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
  if (status === 409) return "This ride changed while you were working. Refresh and try again.";
  if (status === 404) return "This ride could not be found. It may have been removed or reassigned.";
  if (status === 422) return "This ride cannot move to that status right now. Refresh to see the latest state.";
  if (status === 403) return "This action is blocked locally. Set BLOCK_API_WRITES=false when testing write actions.";
  if (status >= 500) return "The server had a problem. Wait a moment and try again.";
  return fallback || "Something went wrong. Try again.";
}

async function readError(response: Response): Promise<DriverApiError> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = {};
  }

  const fallback = payload.message || payload.error || response.statusText;
  return {
    status: response.status,
    title: response.statusText || "Request failed",
    detail: userMessageForStatus(response.status, fallback),
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw await readError(response);
  }

  return (await response.json()) as T;
}

export async function loginDriver(email: string, password: string): Promise<DriverSession> {
  return requestJson<DriverSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerDriver(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  serviceZoneId?: string;
}): Promise<DriverSession> {
  return requestJson<DriverSession>("/api/auth/register-driver", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getDriverRides(session: DriverSession): Promise<DriverRidesResponse> {
  const params = new URLSearchParams({
    driverId: session.driverId,
  });

  if (session.serviceZoneId) params.set("serviceZoneId", session.serviceZoneId);

  return requestJson<DriverRidesResponse>(`/api/driver/rides?${params.toString()}`);
}

export async function getDriverRideDetail(
  id: string,
  session: DriverSession,
): Promise<DriverRideDetail> {
  const params = new URLSearchParams({
    driverId: session.driverId,
  });

  if (session.serviceZoneId) params.set("serviceZoneId", session.serviceZoneId);

  return requestJson<DriverRideDetail>(`/api/driver/rides/${id}?${params.toString()}`);
}

async function getAvailableAmbulanceId(serviceZoneId: string | null): Promise<string> {
  const availability = await requestJson<{
    ambulances: Array<{ id: string; service_zone_id: string | null }>;
  }>("/api/availability");

  const zoneMatch = availability.ambulances.find(
    (ambulance) => serviceZoneId && ambulance.service_zone_id === serviceZoneId,
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
  const ambulanceId = await getAvailableAmbulanceId(input.session.serviceZoneId);

  return requestJson<RideSummary>("/api/rides", {
    method: "POST",
    body: JSON.stringify({
      ride_request_id: input.rideRequestId,
      driver_id: input.session.driverId,
      ambulance_id: ambulanceId,
      assigned_by_user_id: input.session.userId,
    }),
  });
}

export async function updateRideStatus(input: {
  rideId: string;
  status: "in_progress" | "completed" | "rejected";
  rejectionReason?: string;
}): Promise<RideSummary> {
  const body: JsonBody = { status: input.status };
  if (input.rejectionReason) body.rejection_reason = input.rejectionReason;

  return requestJson<RideSummary>(`/api/rides/${input.rideId}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateRideOdometer(input: {
  rideId: string;
  odometerStartKm?: number;
  odometerEndKm?: number;
}): Promise<RideSummary> {
  return requestJson<RideSummary>(`/api/rides/${input.rideId}`, {
    method: "PATCH",
    body: JSON.stringify({
      odometer_start_km: input.odometerStartKm,
      odometer_end_km: input.odometerEndKm,
    }),
  });
}
