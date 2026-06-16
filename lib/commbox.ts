export type DriverNotification = {
  driverId: string;
  phone: string;
  rideRequestId: string;
  sourceAddress: string;
  destinationAddress: string;
  pickupAt?: string | null;
};

function isMockMode(): boolean {
  return process.env.MOCK_COMMBOX === "true" || !process.env.COMMBOX_API_KEY;
}

function buildMockMessage(n: DriverNotification): string {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const pickup = n.pickupAt ? ` | Pickup: ${new Date(n.pickupAt).toLocaleString("he-IL")}` : "";
  return (
    `New ride request: ${n.sourceAddress} → ${n.destinationAddress}${pickup}. ` +
    `Open the driver app to accept: ${appUrl}/driver`
  );
}

async function sendRealNotification(n: DriverNotification): Promise<void> {
  // Placeholder — wire up once Commbox API credentials and message template are confirmed.
  // Expected env vars: COMMBOX_API_KEY, COMMBOX_API_URL, COMMBOX_TEMPLATE_ID
  //
  // Example (adjust to actual Commbox API shape):
  //
  // await fetch(`${process.env.COMMBOX_API_URL}/v1/messages`, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.COMMBOX_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     to: n.phone,
  //     channel: "whatsapp",
  //     template_id: process.env.COMMBOX_TEMPLATE_ID,
  //     params: {
  //       source: n.sourceAddress,
  //       destination: n.destinationAddress,
  //       accept_url: `${process.env.APP_URL}/driver`,
  //     },
  //   }),
  // });
  throw new Error(
    "COMMBOX_API_KEY is set but real outbound integration is not yet implemented. " +
      "Set MOCK_COMMBOX=true to use the mock logger instead.",
  );
}

export async function notifyDriver(notification: DriverNotification): Promise<void> {
  if (isMockMode()) {
    const message = buildMockMessage(notification);
    console.log(
      `[mock-commbox] Would send WhatsApp to ${notification.phone} (driver ${notification.driverId}):\n  "${message}"`,
    );
    return;
  }

  await sendRealNotification(notification);
}

export async function notifyDrivers(notifications: DriverNotification[]): Promise<{
  sent: number;
  failed: number;
}> {
  const results = await Promise.allSettled(notifications.map(notifyDriver));
  const failed = results.filter((r) => r.status === "rejected");

  if (failed.length > 0) {
    failed.forEach((r) => {
      if (r.status === "rejected") console.error("[commbox] Notification failed:", r.reason);
    });
  }

  return { sent: results.length - failed.length, failed: failed.length };
}
