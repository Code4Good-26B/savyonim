# Commbox Webhook API Contract (Phase 1)

This document defines the expected payloads for webhook integrations into Savyonim Dispatch.

## Security Requirements

All webhook calls must include:

- `x-webhook-timestamp`: ISO string or unix timestamp.
- `x-webhook-signature`: HMAC SHA-256 hex digest in either `sha256=<hex>` or `<hex>` format.

Signature input format:

`<timestamp>.<raw-request-body>`

Secret source:

- `COMMBOX_WEBHOOK_SECRET` (required in production)
- Local dev fallback: `dev-only-commbox-secret`

## Endpoint: POST /api/webhooks/ride-request

Creates a `ride_requests` record and returns a mock preview of drivers that would be notified by WhatsApp.

### Request JSON

```json
{
  "request_id": "commbox-12345",
  "service_zone": {
    "id": "11111111-0000-0000-0000-000000000001",
    "region_code": "TLV-N"
  },
  "passenger": {
    "full_name": "Miriam Katz",
    "phone": "050-1111111",
    "national_id": "111111111",
    "emergency_contact": "050-9991111",
    "mobility_need": "walker",
    "category": "elderly"
  },
  "trip": {
    "source_address": "Ibn Gabirol 120, Tel Aviv",
    "destination_address": "Sheba Medical Center, Ramat Gan",
    "source_notes": "Pickup from clinic entrance",
    "destination_notes": "Escort to reception",
    "return_trip_required": false,
    "requested_pickup_at": "2026-05-19T10:30:00.000Z"
  },
  "metadata": {
    "channel": "whatsapp",
    "representative_user_id": "22222222-0000-0000-0000-000000000001"
  }
}
```

### Validation Rules

- `request_id` required.
- `service_zone.id` or `service_zone.region_code` required.
- `passenger.full_name` and `passenger.phone` required.
- `trip.source_address` and `trip.destination_address` required.
- If provided, `trip.requested_pickup_at` must be a valid timestamp.

### Response

- `202 Accepted` on success, including:
  - created `ride_request`
  - `broadcast_preview` with drivers that would receive notifications
- `400` for schema validation failures
- `401` for signature/timestamp failures
- `429` for rate limit violations

## Endpoint: POST /api/webhooks/driver-location-update

Receives driver location updates for future tracking integration.

### Request JSON

```json
{
  "driver_id": "33333333-0000-0000-0000-000000000001",
  "latitude": 32.0853,
  "longitude": 34.7818,
  "recorded_at": "2026-05-19T10:20:00.000Z",
  "ride_id": "77777777-0000-0000-0000-000000000001",
  "accuracy_meters": 8.2
}
```

### Validation Rules

- `driver_id` required.
- `latitude` must be a number between `-90` and `90`.
- `longitude` must be a number between `-180` and `180`.
- `recorded_at` must be a valid timestamp when supplied.
- `driver_id` must exist in `drivers` table.

### Response

- `202 Accepted` when payload is valid (storage is intentionally deferred to future phase).
- `400` for schema validation failures.
- `401` for signature/timestamp failures.
- `404` when `driver_id` is unknown.
- `429` for rate limit violations.
