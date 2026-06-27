# Revised MVP Delivery Plan – Savyonim Dispatch

**Current State (as of 2026-05-15):**
- ✅ Database schema complete with RLS foundation
- ✅ API endpoints scaffolded (CRUD routes for all entities)
- ✅ Local Supabase Docker infrastructure for testing
- 🟡 Row Level Security policies (in progress)
- ❌ No UI (dispatcher dashboard, driver interface, forms)
- ❌ No race-condition handling implemented
- ❌ No Commbox integration or mock
- ❌ No Server Actions or form handling logic

**Gap Analysis:** The original plan assumed Weeks 1-2 would have basic UI + API contract defined. Those haven't started. Realistic assessment: **2-3 weeks behind.**

---

## Revised 8-Week Plan (Starting Sunday, May 19)

### Phase 1: Security & Foundation (Weeks 1-2) — May 19–June 1
**Goal:** Lock in database layer; unblock all teams with secure, tested API.

#### Backend & Security Lead
- **Complete RLS policies**
  - Test policies with seed users (admin, dispatcher, driver, representative)
  - Validate that drivers can only see their assigned rides
  - Ensure representatives only see requests for their service zone
- **Write Server Actions** (shared utilities all teams use)
  - `acceptRide()` – with race-condition guard (unique constraint)
  - `rejectRide(reason)` – with audit trail
  - `updateRideOdometer(start, end)` – with validation
  - `listMyRides()` – respects RLS
- **Set up Supabase schema validation tests**
  - Test race condition mitigation: two concurrent accepts → only one succeeds
  - Test state-machine transitions (request status flow)
  - Result: Green CI/CD before UI teams touch anything

#### Infrastructure & Integrations Lead
- **Define API Contract** (document expected webhook shape from Commbox)
  - POST `/api/webhooks/ride-request` – creates ride_request, broadcasts drivers
  - POST `/api/webhooks/driver-location-update` – for future location tracking
- **Build Mock Webhook Server**
  - CLI script that triggers realistic ride requests to test the system
  - Example: `npm run mock:broadcast-ride` creates ride, logs drivers' WhatsApp would be sent
- **Add request validation & auth middleware**
  - Validate webhook signatures (from Commbox or mock)
  - Rate limiting on endpoints
- **Deliverable:** "npm run dev" + "npm run mock:broadcast-ride" creates a testable end-to-end skeleton

---

### Phase 2: UI Shells & Form Wiring (Weeks 3-4) — June 2–June 15
**Goal:** Create non-functional but routable UI; connect forms to APIs without logic.

#### Dispatcher Dashboard Lead (FS1)
- **Dashboard layout** (Sidebar, ride list, detail panel)
  - Page routes: `/dispatcher/dashboard`, `/dispatcher/requests`, `/dispatcher/request/[id]`
  - No data fetching yet, mock data only
- **"Create Ride" form**
  - Fields: passenger phone, pickup address, dropoff, return trip needed
  - Form validates shape but doesn't POST yet (button disabled)
- **Ride list view**
  - Columns: Passenger, Status, Assigned Driver, Pickup Time
  - Click row to open detail panel (mock data)
- **Deliverable:** UI routes render; forms accept input; no API calls

#### Driver Interface Lead (FS2)
- **Driver auth flow** (for MVP: WhatsApp link → pre-signed unique driver token)
  - Route: `/driver/accept/[rideId]/[token]` – pre-fills ride details
  - Shows passenger name, pickup/dropoff, vehicle assigned
- **Accept/Reject buttons** (non-functional UI)
- **Ride completion form**
  - Route: `/driver/rides/[id]/complete`
  - Fields: Start odometer, End odometer, Notes
  - Validates numeric input
- **Deliverable:** Driver can navigate from WhatsApp link → see ride → see completion form

#### Backend & Security Lead (support)
- **Server Actions for each form** (stubs that log but don't write)
  - `submitNewRequest()` – logs form data
  - `acceptRideAction()` – logs attempt
  - `submitCompletion()` – logs mileage
- **Add `/api/rides/mock-broadcast`** endpoint (for QA: manually trigger "new rides available" message)

---

### Phase 3: Form Logic & Data Integration (Weeks 5-6) — June 16–June 29
**Goal:** Forms POST to API; data flows end-to-end (but no Commbox yet).

#### Backend & Security Lead
- **Wire Server Actions to real database calls**
  - `acceptRide()` now uses race-condition guard (upsert with unique constraint)
  - Test: Two rapid accepts → one succeeds, other gets "ride taken" message
- **Add race-condition tests**
  - Simulate concurrent requests, assert one driver assigned
  - CI must pass these before merging
- **Validation layer**
  - Phone number format (Israeli +972)
  - Mileage must be numeric, end > start
  - Pickup/dropoff must not be empty
- **Error handling**
  - "Ride already taken" → 409 Conflict
  - "Invalid token" → 401 Unauthorized
  - User sees friendly errors in UI

#### Dispatcher Dashboard Lead (FS1)
- **Connect ride list to API**
  - Query `ride_requests` filtered by service zone
  - Real-time updates when dispatcher creates new request
- **Connect "Create Ride" form**
  - POST to `/api/ride-requests`
  - On success: redirect to ride detail, show "Drivers notified"
  - On error: show error toast
- **Ride detail panel**
  - Shows live status updates (request → approved → waiting → in progress)
  - Mock: Use polling; real: Supabase real-time subscriptions (if time)

#### Driver Interface Lead (FS2)
- **Accept button**
  - POST to `/api/rides/[id]/accept` with driver token
  - If race condition: "Ride taken by another driver" message
  - If success: confirm screen, show "Get to pickup location"
- **Completion form**
  - POST odometer data to `/api/rides/[id]/complete`
  - Server validates, updates ride status → completed
  - Driver sees "Thank you" screen

#### Infrastructure & Integrations Lead (support)
- **Mock Commbox webhook**
  - `npm run mock:send-ride` creates ride_request + broadcasts JSON to drivers
  - Logs what messages would be sent to WhatsApp

---

### Phase 4: Commbox Integration (Week 7) — June 30–July 6
**Goal:** Replace mock with real Commbox (or stay mocked if integration delayed).

#### Infrastructure & Integrations Lead (+ TL support)
- **Connect to Commbox API** (if credentials available)
  - Receive real ride requests from Commbox bot
  - Send driver WhatsApp notifications via Commbox
- **If Commbox not ready:**
  - Polish the mock to be more realistic
  - Add env flag `MOCK_COMMBOX=true` for staging/demo
  - Document: "To integrate real Commbox, set API key + webhook secret"

---

### Phase 5: End-to-End Testing & Refinement (Week 8) — July 7–July 11
**Goal:** System works for a full ride lifecycle; handle edge cases.

#### All Leads
- **Full scenario test:**
  1. Dispatcher creates ride request (manual form or mock Commbox)
  2. Driver receives WhatsApp link (mock logs this; real sends via Commbox)
  3. Driver clicks link, sees ride, accepts
  4. Another driver tries to accept → sees "Ride taken" (test race condition)
  5. First driver completes ride with mileage
  6. Dispatcher sees ride marked "completed"
- **Edge case testing:**
  - Driver rejects ride → next driver can accept
  - Driver token expires → shows error
  - Dispatcher edits passenger phone → driver doesn't see it mid-ride
  - Network failure during ride submission → retry logic
- **Performance check:**
  - Load test: 50 concurrent drivers clicking accept link → only 1 assigned
  - Dashboard shows live updates without lag
- **UX polish:**
  - Mobile responsive on driver interface
  - Error messages are actionable
  - Accessibility review (alt text, keyboard nav)

#### TL (Alin)
- **Code review & merge to main**
  - All features on dev, merge to main in order: RLS → Backend → Dashboard → Driver UI → Commbox
  - Write deployment runbook for Vercel
- **Documentation**
  - Dispatcher guide: "Create a new ride"
  - Driver guide: "Accept and complete a ride"
  - Admin guide: "Monitor system health"

---

## Team Roles & Responsibilities (Domain Ownership Model)

**Assign 1 team member to each role:**

| Domain | Role | Weeks 1-2 | Weeks 3-4 | Weeks 5-6 | Weeks 7-8 |
|--------|------|----------|----------|----------|----------|
|  Backend & Security  | Owner: Daniel| Complete RLS, Server Actions, race-condition tests | API validation & error handling | Integrate form logic, DB edge cases | Bug fixes & edge cases |


|  Infrastructure & Integrations  | Owner: Ronica | Define API Contract, build Mock webhook server | Webhook receiver logic, auth middleware | Commbox API integration (if ready) | Integration testing & stability |


|  Dispatcher Dashboard (FS1)  | Owner: Tomer | – | UI shells, routing, mock data | Connect forms to API, real-time updates | Polish UX, error states |


|  Driver Interface (FS2)  | Owner: Ran| – | Auth flow, routing, form shells | Accept/complete logic, race-condition handling | Mobile responsiveness, error UX |


|  Team Lead & Architecture  | Alin | Architecture decisions, RLS approval, merge strategy | PR review & integration | Code review & integration | Final merge to main, deployment, docs |

---

## Success Criteria by Phase

### End of Phase 1 (June 1)
- ✅ All RLS tests pass (CI green)
- ✅ Race-condition test: concurrent accepts → 1 succeeds, 1 gets "taken" error
- ✅ Server Actions callable (even if they just log)
- ✅ Mock webhook server runs: `npm run mock:broadcast-ride`

### End of Phase 2 (June 15)
- ✅ Dispatcher can navigate to `/dispatcher/dashboard`, see mock ride list
- ✅ Dispatcher can fill "Create Ride" form (button not functional)
- ✅ Driver can access `/driver/accept/[rideId]/[token]`, see ride details
- ✅ Driver can see completion form with fields pre-filled

### End of Phase 3 (June 29)
- ✅ Dispatcher creates ride → API stores it → appears in dashboard
- ✅ Driver accepts ride → status updates to "assigned" → dispatcher sees it
- ✅ Two drivers click accept link simultaneously → only 1 succeeds
- ✅ Driver completes ride (odometer) → status updates to "completed"

### End of Phase 4 (July 6)
- ✅ Commbox webhook receives ride → stored in DB → drivers notified (or mock logs it)
- ✅ Driver WhatsApp link works end-to-end

### End of Phase 5 (July 11) — MVP SHIPPED
- ✅ Full cycle: request → assignment → completion works
- ✅ No security issues (RLS enforced, tokens validated)
- ✅ No race conditions (concurrent accepts tested)
- ✅ Basic docs for Savyonim staff
- ✅ Deployed on Vercel, dev team trained

---

## Weekly Sync Checklist

Every Monday 10am (or your preferred time):

1. **Phase status:** Are we on track for the phase goal?
2. **Blockers:** Any infra/API issues blocking UI teams?
3. **Code:** Any PRs stuck in review?
4. **Next week:** What each domain will deliver

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Commbox integration delayed | Use mock webhook all the way; flag Commbox as "post-MVP feature" |
| Backend team blocked on RLS | TL clarifies policy logic; spin up spike task |
| Race condition hard to reproduce | Write deterministic test (not just load test); use seeded DB |
| UI not mobile-friendly on driver side | Check regularly; driver interface is **not** responsive design—single use case, small screen |
| Team member unavailable | Plan for spillover to TL; prepare contingency person |

---

## Notes for TL (Alin)

- **Parallel work:** Dashboard and Driver UI teams can work independently starting Week 3 (API contract locked Week 1).
- **Merge strategy:** Keep dev as working branch; main = stable/deployable. Merge features to dev; TL merges to main once tested.
- **Independence:** Each role owner owns their domain completely—they decide implementation details, file structure, libraries (within reason). Only code review for quality.
- **Communicate:** If Commbox credentials arrive early, pull Week 7 work into Week 6.
- **Demo:** At end of Week 6, have a live demo ready (mock ride → driver accepts → completion).
