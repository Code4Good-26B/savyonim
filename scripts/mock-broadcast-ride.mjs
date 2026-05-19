import { createHmac } from "node:crypto";

const baseUrl = process.env.MOCK_WEBHOOK_BASE_URL ?? "http://localhost:3000";
const secret = process.env.COMMBOX_WEBHOOK_SECRET ?? "dev-only-commbox-secret";

function sign(rawBody, timestamp, signingSecret) {
  const digest = createHmac("sha256", signingSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return `sha256=${digest}`;
}

function buildPayload() {
  const requestId = `mock-${Date.now()}`;

  return {
    request_id: requestId,
    service_zone: {
      region_code: "TLV-N",
    },
    passenger: {
      full_name: "Mock Passenger",
      phone: "050-1234000",
      category: "general",
      mobility_need: "none",
    },
    trip: {
      source_address: "Ibn Gabirol 120, Tel Aviv",
      destination_address: "Sheba Medical Center, Ramat Gan",
      source_notes: "Pickup from clinic entrance",
      destination_notes: "Patient requires escort to reception",
      return_trip_required: false,
      requested_pickup_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    metadata: {
      channel: "whatsapp",
    },
  };
}

async function run() {
  const payload = buildPayload();
  const rawBody = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = sign(rawBody, timestamp, secret);

  console.log("[mock] Sending ride-request webhook");
  console.log(`[mock] Target: ${baseUrl}/api/webhooks/ride-request`);
  console.log(`[mock] request_id: ${payload.request_id}`);

  const response = await fetch(`${baseUrl}/api/webhooks/ride-request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-timestamp": timestamp,
      "x-webhook-signature": signature,
      "x-webhook-provider": "mock-commbox",
    },
    body: rawBody,
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`[mock] Failed (${response.status}): ${text}`);
    process.exitCode = 1;
    return;
  }

  console.log("[mock] Webhook accepted");
  console.log(text);
  console.log("[mock] This simulates creating a ride request and listing drivers that would get WhatsApp notifications.");
}

run().catch((error) => {
  console.error("[mock] Unexpected error", error);
  process.exitCode = 1;
});
