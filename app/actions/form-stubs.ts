"use server";

export async function submitNewRequest(formData: FormData) {
  console.log("Stub: submitNewRequest called with data:", Object.fromEntries(formData));
  return { success: true, message: "Request logged (stub)" };
}

export async function acceptRideAction(rideId: string, driverId: string) {
  console.log("Stub: acceptRideAction called with rideId:", rideId, "driverId:", driverId);
  return { success: true, message: "Accept ride logged (stub)" };
}

export async function submitCompletion(rideId: string, mileage: number) {
  console.log("Stub: submitCompletion called with rideId:", rideId, "mileage:", mileage);
  return { success: true, message: "Completion logged (stub)" };
}
