# Intake API Contract: POST /api/intake/ride-request

Status: Draft contract aligned to Issue #42.

## Purpose

This endpoint accepts a full travel request payload from:

- Commbox chatbot integration
- Dispatcher manual form

The server validates input, resolves passenger identity, and creates a ride request.

## Authentication

Header:

Authorization: Bearer <api-key>

Configuration:

- Env var: COMMBOX_INTAKE_API_KEY
- Development fallback (for local testing only): dev-commbox-api-key

Failure:

- 401 when header is missing or API key is invalid.

## Request Body Schema

```json
{
  "caller_full_name": "string, required",
  "caller_id_number": "string, required",
  "caller_phone": "string, required",
  "request_for_self": "boolean, required",
  "passenger": {
    "full_name": "string, required when request_for_self=false",
    "national_id": "string, required when request_for_self=false",
    "phone": "string, required when request_for_self=false",
    "emergency_contact": "string, optional",
    "mobility_need": "walking|wheelchair|walker|cane, required when request_for_self=false",
    "category": "wounded_soldier|idf_disabled|holocaust_survivor|cancer_patient|dialysis_patient|other, required when request_for_self=false"
  },
  "category": "wounded_soldier|idf_disabled|holocaust_survivor|cancer_patient|dialysis_patient|other, required when request_for_self=true",
  "trip_type": "medical|leisure, required",
  "source_address": "string, required",
  "destination_address": "string, required",
  "requested_pickup_at": "ISO datetime, optional",
  "requested_arrival_at": "ISO datetime, required when trip_type=medical",
  "estimated_departure_at": "ISO datetime, optional",
  "waiting_time_minutes": "positive integer or null, optional",
  "leisure_window_start": "HH:MM, required when trip_type=leisure",
  "leisure_window_end": "HH:MM, required when trip_type=leisure",
  "return_trip_required": "boolean, required",
  "service_zone_id": "uuid, optional"
}
```

## Conditional Validation Rules

- trip_type=medical requires requested_arrival_at.
- trip_type=leisure requires leisure_window_start and leisure_window_end.
- leisure_window_end must be after leisure_window_start.
- request_for_self=false requires full passenger object.
- request_for_self=true requires top-level category.

## Success Response

When fully implemented (post dependency issues):

```json
{
  "ride_request_id": "uuid",
  "passenger_id": "uuid",
  "status": "pending"
}
```

Status code: 201 Created

## Error Responses

### 400 Validation failure

```json
{ "error": "requested_arrival_at is required for medical trips" }
```

### 401 Missing/invalid token

```json
{ "error": "Invalid API key" }
```

### 500 Unexpected server error

```json
{ "error": "Internal server error" }
```

## Commbox Mapping Notes

- caller_* fields should map from the contact initiating the conversation.
- request_for_self should be true only when caller and passenger are the same person.
- If Commbox cannot collect emergency_contact, send null or omit.
- If Commbox cannot determine waiting_time_minutes, send null.

## Dependency Notes

This contract assumes DB and types from:

- Issue #40 (schema + enums)
- Issue #41 (TypeScript updates)

Current spike route exists at app/api/intake/ride-request/route.ts and already enforces auth + validation, but intentionally blocks DB writes until dependencies are finalized.
