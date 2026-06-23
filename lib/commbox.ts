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
  const apiKey = process.env.COMMBOX_API_KEY!;
  const apiUrl = (process.env.COMMBOX_API_URL ?? "https://api.commbox.io").replace(/\/$/, "");
  const templateId = process.env.COMMBOX_TEMPLATE_ID;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!templateId) {
    throw new Error("COMMBOX_TEMPLATE_ID is required for outbound notifications");
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: n.phone,
        channel: "whatsapp",
        template_id: templateId,
        params: {
          source: n.sourceAddress,
          destination: n.destinationAddress,
          accept_url: `${appUrl}/driver`,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new Error(
      `Commbox API unreachable for driver ${n.driverId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Commbox API ${response.status} for driver ${n.driverId} (${n.phone}): ${text}`);
  }

  console.log(
    JSON.stringify({
      level: "info",
      source: "commbox",
      event: "notification_sent",
      driver_id: n.driverId,
      phone: n.phone,
      ride_request_id: n.rideRequestId,
      timestamp: new Date().toISOString(),
    }),
  );
}

export async function notifyDriver(notification: DriverNotification): Promise<void> {
  if (isMockMode()) {
    console.log(
      JSON.stringify({
        level: "info",
        source: "mock-commbox",
        event: "whatsapp_notification_preview",
        driver_id: notification.driverId,
        phone: notification.phone,
        ride_request_id: notification.rideRequestId,
        message: buildMockMessage(notification),
        timestamp: new Date().toISOString(),
      }),
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
