# Intake/Webhook Spike Handoff for Daniel

Status: Prepared as a draft/spike branch. Do not merge to dev until Issues #40, #41, #42 are finalized.

## What Was Implemented

### 1. Webhook security and validation scaffold

- app/api/webhooks/ride-request/route.ts
- app/api/webhooks/driver-location-update/route.ts
- lib/webhook-security.ts
- lib/webhook-contracts.ts
- lib/rate-limit.ts
- scripts/mock-broadcast-ride.mjs

What it does now:

- Verifies signature and timestamp headers.
- Applies simple in-memory rate limiting.
- Validates payload shape.
- Creates ride_requests for webhook ride-request path using current schema.
- Provides a mock broadcast preview (drivers list).

### 2. Intake contract and route alignment scaffold

- docs/api/intake-ride-request.md
- lib/intake-contract.ts
- app/api/intake/ride-request/route.ts

What it does now:

- Enforces Authorization: Bearer <api-key> with COMMBOX_INTAKE_API_KEY.
- Implements #42-aligned validation rules and conditional required fields.
- Returns 501 blocked response by design, to avoid wrong DB writes before #40/#41.

## Why It Is Blocked

The full #43 implementation requires schema and types not finalized in this branch:

- #40 introduces new ride_request columns and enum updates.
- #41 updates TypeScript domain types to match #40.
- #35/#36 affect user-context auth model and route security expectations.

## Proposed Implementation Plan for Daniel Once Dependencies Land

1. Replace 501 in app/api/intake/ride-request/route.ts with real DB write flow.
2. Use a transaction-safe approach:
   - Prefer DB function/RPC for atomic passenger lookup/create + ride_request insert.
3. Insert all #40 fields:
   - caller_full_name, caller_id_number, caller_phone, request_for_self
   - trip_type, requested_arrival_at, estimated_departure_at
   - waiting_time_minutes, leisure_window_start, leisure_window_end
4. Return #43 response shape:
   - ride_request_id, passenger_id, status
5. Add integration tests in __integration__ for:
   - medical self-request
   - leisure request for other passenger
   - existing passenger no-duplicate case
   - 400 validation matrix
   - 401 missing/invalid API key

## Decisions Ronica Can Make Now (To Unblock Daniel)

1. API key env naming and rotation policy
- Confirm COMMBOX_INTAKE_API_KEY as final name.
- Decide if key rotation should support two active keys during rollout.

2. Time formats
- Keep ISO datetime for requested_arrival_at and estimated_departure_at.
- Keep HH:MM local time for leisure window fields.

3. Passenger category ownership
- Confirm category source when request_for_self=true:
  - Use top-level category field (current contract), or
  - derive from existing passenger record when available.

4. Transaction strategy
- Decide whether to implement transaction in route code via SQL RPC function.
- Recommended: RPC function for true atomicity and easier auditing.

5. Auth model boundary
- Confirm this intake endpoint stays API-key based for Commbox/dispatcher integration.
- Clarify if JWT user auth is additionally required for dispatcher UI path.

## Risk Notes

- Current webhook scaffold still uses current-schema mobility_need values including none in some places; #40/#41 may require walking migration handling.
- proxy.ts currently allows /api/webhooks/* through write guard because those routes enforce signature auth themselves. Reconfirm this when global auth policy (#36) is finalized.

## Quick Start for Daniel

- Read docs/api/intake-ride-request.md
- Read lib/intake-contract.ts
- Implement DB write section in app/api/intake/ride-request/route.ts
- Add integration tests under __integration__

## Branch Policy

Keep this branch as draft/spike until:

- #40 done
- #41 done
- #42 accepted by TL

Only then complete #43 implementation and open PR.
