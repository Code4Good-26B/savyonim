# Infrastructure and Integrations Spike Report

Date: 2026-05-19
Owner Role Context: Infrastructure and Integrations Lead (Ronica)
Branch: spike/intake-webhook-handoff-2026-05-19

## Purpose

This report documents all spike changes completed for infrastructure and integration work, and maps those changes to:

- Open GitHub issues (#33, #34, #35, #36, #37, #40, #41, #42, #43, #44, #45)
- Revised MVP Delivery Plan (Phase 1 and prep for Phase 2)
- Handoff expectations for Daniel and the backend track

This branch is intentionally a draft/spike branch and should not be merged to dev until dependencies are finalized.

## Scope Completed in This Spike

### 1. Commbox webhook contract and endpoints (Phase 1)

Implemented:

- POST /api/webhooks/ride-request
- POST /api/webhooks/driver-location-update

Files:

- app/api/webhooks/ride-request/route.ts
- app/api/webhooks/driver-location-update/route.ts
- docs/commbox-webhook-contract.md

Behavior:

- Validates webhook signatures with HMAC SHA-256
- Validates webhook timestamp freshness window
- Applies endpoint rate limiting
- Validates payload structure
- Ride-request route creates a ride_requests row and returns a broadcast preview for drivers
- Driver-location route validates payload and accepts update as 202 (storage intentionally deferred)

### 2. Mock webhook sender CLI (Phase 1 deliverable)

Implemented:

- npm run mock:broadcast-ride
- npm run mock:send-ride (alias)

Files:

- scripts/mock-broadcast-ride.mjs
- package.json
- README.md

Behavior:

- Sends signed mock webhook payload to local app
- Logs what would be sent to drivers
- Supports testable skeleton flow: npm run dev plus npm run mock:broadcast-ride

### 3. Security middleware and request controls

Implemented:

- Shared signature helpers and verification
- Shared webhook payload validators
- Shared in-memory rate limiter
- Write-guard bypass for webhook routes only (since webhook auth/signature is enforced at route level)

Files:

- lib/webhook-security.ts
- lib/webhook-contracts.ts
- lib/rate-limit.ts
- proxy.ts

### 4. Intake contract and implementation scaffold for Issue #42 and #43

Implemented:

- Formal intake API contract draft at docs/api/intake-ride-request.md
- Validation and schema helper in lib/intake-contract.ts
- Intake route skeleton with Authorization Bearer API-key enforcement and full validation

Files:

- docs/api/intake-ride-request.md
- lib/intake-contract.ts
- app/api/intake/ride-request/route.ts

Important status:

- Intake DB write path intentionally blocked with 501 on this spike branch.
- This avoids encoding wrong write logic before Issues #40 and #41 finalize schema/types.

### 5. Handoff docs for Daniel and backend implementation

Implemented:

- Detailed handoff and dependency guide
- Decision checklist for Ronica to finalize and communicate

Files:

- docs/handoff/intake-spike-handoff-for-daniel.md

## Test Coverage Added

Files:

- __tests__/webhook-security.test.ts
- __tests__/webhook-contracts.test.ts

Results:

- Focused tests pass (7 tests total) for security and contract helpers.
- Existing unrelated legacy unit failures remain outside this spike scope.

## Mapping to Revised MVP Delivery Plan

### Phase 1: Security and Foundation (May 19 to June 1)

Infrastructure and Integrations lead tasks from plan vs status:

1. Define API contract (Commbox webhook shape)
- Status: Completed in spike
- Evidence:
  - docs/commbox-webhook-contract.md
  - docs/api/intake-ride-request.md (intake contract for chatbot and dispatcher flow)

2. Build mock webhook server/CLI
- Status: Completed in spike
- Evidence:
  - scripts/mock-broadcast-ride.mjs
  - package.json scripts

3. Add validation and auth middleware
- Status: Completed in spike
- Evidence:
  - Signature auth: lib/webhook-security.ts
  - Validation: lib/webhook-contracts.ts and lib/intake-contract.ts
  - Rate limiting: lib/rate-limit.ts

4. Deliverable: npm run dev plus npm run mock:broadcast-ride
- Status: Completed in spike
- Evidence:
  - README instructions
  - mock script and endpoint integration

Phase 1 note:
- Core infrastructure and integration scaffolding is ready.
- Finalization depends on backend schema/type/auth issue chain.

### Phase 2 prep support

- Intake contract and route validation foundation are prepared now.
- Dispatcher form integration path is documented and unblocked once API is finalized.

## Issue-by-Issue Impact and Dependency Status

### Issue #42 (Intake API contract)
- Status in this spike: Substantially addressed with docs/api/intake-ride-request.md
- Remaining: final approval by TL and alignment with final schema from #40 and #41

### Issue #43 (Intake API implementation)
- Status in this spike: Partially scaffolded
- Completed:
  - Route path created
  - Bearer API key auth implemented
  - Validation matrix implemented
- Remaining:
  - Transaction-safe passenger lookup/create plus ride_request insert
  - Success response 201 with ride_request_id/passenger_id/status
  - Integration tests for happy paths and failure matrix

### Issue #40 (DB migration for new travel request fields and enum updates)
- Status in this spike: Not implemented here, but referenced everywhere needed
- Dependency impact: blocks final intake write implementation

### Issue #41 (Type updates for new DB fields)
- Status in this spike: Not implemented here, but validation contract prepared
- Dependency impact: blocks final typed write path and complete API updates

### Issue #35 and #36 (JWT client and route auth enforcement)
- Status in this spike: not fully implemented
- Current intake uses API key model per Issue #42 expectation
- Dependency impact: final auth boundary decisions needed for dispatcher route path

### Other open issues (#33, #34, #37, #44, #45)
- Status in this spike: not directly implemented
- Relationship:
  - #44 and #45 consume schema and intake contract outputs
  - #33/#34/#37 are backend/auth policy foundations

## Decisions Ronica Should Finalize and Communicate to Daniel

These decisions should be finalized now to reduce implementation churn:

1. API key and rotation policy
- Confirm COMMBOX_INTAKE_API_KEY as final env var
- Decide whether to support temporary dual keys during rotation

2. Time formats
- Keep ISO datetime for requested_arrival_at and estimated_departure_at
- Keep HH:MM for leisure_window_start and leisure_window_end

3. Category ownership when request_for_self=true
- Decide whether category is always request payload value or can be derived from existing passenger record

4. Transaction strategy for #43
- Decide to implement write logic via RPC function for atomic operation (recommended)

5. Auth boundary for intake endpoint
- Confirm whether API-key-only is sufficient for Commbox and dispatcher, or if dispatcher path must also enforce JWT user context

## Recommended Next Steps for Daniel After #40/#41/#42 Finalization

1. Replace 501 block in app/api/intake/ride-request/route.ts with transaction-safe write path.
2. Add integration tests for:
- medical self-request
- leisure request for someone else
- existing passenger reuse path
- 400 validation matrix
- 401 missing or invalid token
3. Update passengers and ride-requests endpoints per #44 with new enum and field validation.

## Branch Policy

This is a spike branch and should remain draft until:

- Issue #40 is merged and schema is stable
- Issue #41 is merged and types are stable
- Issue #42 contract is approved by TL

After that, complete #43 implementation and open PR to dev.
