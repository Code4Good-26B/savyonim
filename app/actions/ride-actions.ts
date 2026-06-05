"use server";

import { createSupabaseClient } from "@/lib/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

/**
 * Accepts a ride request by creating a ride entry.
 * Handles race conditions gracefully if ambulance or request is already active.
 */
export async function acceptRide(
  rideRequestId: string,
  driverId: string,
  ambulanceId: string
): Promise<ActionResponse> {
  // 1. Input Validation
  if (!rideRequestId || !isValidUuid(rideRequestId)) {
    return { success: false, message: "Invalid rideRequestId format", error: "Invalid rideRequestId format" };
  }
  if (!driverId || !isValidUuid(driverId)) {
    return { success: false, message: "Invalid driverId format", error: "Invalid driverId format" };
  }
  if (!ambulanceId || !isValidUuid(ambulanceId)) {
    return { success: false, message: "Invalid ambulanceId format", error: "Invalid ambulanceId format" };
  }

  const supabase = createSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("rides")
      .insert({
        ride_request_id: rideRequestId,
        driver_id: driverId,
        ambulance_id: ambulanceId,
        status: "assigned",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        if (error.message?.includes("ux_rides_active_ambulance")) {
          return { success: false, message: "Ambulance already has an active ride", error: "Ambulance already has an active ride" };
        }
        if (error.message?.includes("ux_rides_active_request")) {
          return { success: false, message: "Ride already taken by another driver", error: "Ride already taken by another driver" };
        }
        return { success: false, message: "Ride already taken by another driver", error: "Ride already taken by another driver" };
      }
      return { success: false, message: error.message, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const pgError = err as { code?: string; message?: string };
    if (pgError.code === "23505") {
      if (pgError.message?.includes("ux_rides_active_ambulance")) {
        return { success: false, message: "Ambulance already has an active ride", error: "Ambulance already has an active ride" };
      }
      if (pgError.message?.includes("ux_rides_active_request")) {
        return { success: false, message: "Ride already taken by another driver", error: "Ride already taken by another driver" };
      }
      return { success: false, message: "Ride already taken by another driver", error: "Ride already taken by another driver" };
    }
    const message = errorMessage(err);
    return {
      success: false,
      message,
      error: message,
    };
  }
}

/**
 * Rejects a ride by setting its status to rejected.
 * Validates transition from the ride's current status.
 */
export async function rejectRide(
  rideId: string,
  reason: string
): Promise<ActionResponse> {
  // 1. Input Validation
  if (!rideId || !isValidUuid(rideId)) {
    return { success: false, message: "Invalid rideId format", error: "Invalid rideId format" };
  }
  if (!reason || typeof reason !== "string" || reason.trim() === "") {
    return { success: false, message: "rejection_reason is required when rejecting", error: "rejection_reason is required when rejecting" };
  }

  const supabase = createSupabaseClient();

  // 2. Fetch current status
  const { data: current, error: fetchError } = await supabase
    .from("rides")
    .select("status")
    .eq("id", rideId)
    .single();

  if (fetchError || !current) {
    return { success: false, message: "Ride not found", error: "Ride not found" };
  }

  // 3. Validate state transition
  const VALID_TRANSITIONS: Record<string, string[]> = {
    assigned: ["in_progress", "rejected"],
    in_progress: ["completed", "rejected"],
    completed: [],
    rejected: [],
  };

  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes("rejected")) {
    const errorMsg = `Invalid transition: ${current.status} → rejected`;
    return { success: false, message: errorMsg, error: errorMsg };
  }

  // 4. Update status to rejected
  const { data, error } = await supabase
    .from("rides")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", rideId)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message, error: error.message };
  }

  return { success: true, data };
}

/**
 * Updates a ride's odometer readings.
 * Ensures odometer_end_km is always greater than or equal to odometer_start_km.
 */
export async function updateRideOdometer(
  rideId: string,
  startKm?: number,
  endKm?: number
): Promise<ActionResponse> {
  // 1. Input Validation
  if (!rideId || !isValidUuid(rideId)) {
    return { success: false, message: "Invalid rideId format", error: "Invalid rideId format" };
  }

  if (startKm === undefined && endKm === undefined) {
    return { success: false, message: "No fields to update", error: "No fields to update" };
  }

  if (startKm !== undefined && (typeof startKm !== "number" || isNaN(startKm) || startKm < 0)) {
    return { success: false, message: "odometer_start_km must be a positive number", error: "odometer_start_km must be a positive number" };
  }
  if (endKm !== undefined && (typeof endKm !== "number" || isNaN(endKm) || endKm < 0)) {
    return { success: false, message: "odometer_end_km must be a positive number", error: "odometer_end_km must be a positive number" };
  }

  if (startKm !== undefined && endKm !== undefined && endKm < startKm) {
    return {
      success: false,
      message: "odometer_end_km must be greater than or equal to odometer_start_km",
      error: "odometer_end_km must be greater than or equal to odometer_start_km",
    };
  }

  const supabase = createSupabaseClient();

  // 2. Fetch current values to check logic with existing values
  const { data: current, error: fetchError } = await supabase
    .from("rides")
    .select("odometer_start_km, odometer_end_km")
    .eq("id", rideId)
    .single();

  if (fetchError || !current) {
    return { success: false, message: "Ride not found", error: "Ride not found" };
  }

  // Combine new parameters with existing DB values
  const finalStart = startKm !== undefined ? startKm : current.odometer_start_km;
  const finalEnd = endKm !== undefined ? endKm : current.odometer_end_km;

  if (finalStart !== null && finalEnd !== null && finalEnd < finalStart) {
    return {
      success: false,
      message: "odometer_end_km must be greater than or equal to odometer_start_km",
      error: "odometer_end_km must be greater than or equal to odometer_start_km",
    };
  }

  const patch: Record<string, number> = {};
  if (startKm !== undefined) patch.odometer_start_km = startKm;
  if (endKm !== undefined) patch.odometer_end_km = endKm;

  // 3. Update DB
  const { data, error } = await supabase
    .from("rides")
    .update(patch)
    .eq("id", rideId)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message, error: error.message };
  }

  return { success: true, data };
}

/**
 * Lists the authenticated user's assigned rides.
 * Securely fetches the user session and queries the database.
 * Relies on the database RLS policies to restrict rows to only matching driver's rides.
 */
export async function listMyRides(): Promise<ActionResponse<unknown[]>> {
  const supabase = createSupabaseClient();

  try {
    // 1. Authenticate user securely on the server
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Unauthorized", error: "Unauthorized" };
    }

    // 2. Fetch rides. Rely on database RLS policies to filter rows
    const { data: rides, error: fetchError } = await supabase
      .from("rides")
      .select("*");

    if (fetchError) {
      return { success: false, message: fetchError.message, error: fetchError.message };
    }

    return { success: true, data: rides || [] };
  } catch (err: unknown) {
    const message = errorMessage(err);
    return {
      success: false,
      message,
      error: message,
    };
  }
}
