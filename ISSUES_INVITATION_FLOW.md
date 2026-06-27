# Implementation Issues — Supabase-Auth Invite & Two-Step Registration

**Architecture decision (TL):** Shift **all users** onto **native Supabase Auth**. Registration is
**invite-based** with a **two-step approval flow**. The previous custom-auth registration model
(`lib/auth/local-auth.ts` HMAC JWT, direct `auth.users` inserts in `app/api/auth/register-driver`)
is **overridden and decommissioned**.

## The flow (target)
1. **Invite** — an authorized user sends an invite via Supabase Auth (`inviteUserByEmail`); the
   assigned role is stored in user metadata.
2. **Onboarding form** — the invitee clicks the email link, lands on `/onboarding`, and gets a
   **role-specific form** (Driver form vs Representative form).
3. **Pending state** — on submit, the account is created with `status = 'pending'`; the user sees
   *"Registration received, waiting for system approval"* and **cannot access the main system**.
4. **Approval** — an authorized reviewer explicitly **approves** (or rejects). Only an `approved`
   user can fully log in.

## Permission matrix (invite **and** approve gated identically)
| New user | Who may invite & approve |
|----------|--------------------------|
| **Representative** | **Super Admin** only (existing `admin` role) |
| **Driver** | **Super Admin**, or a **Representative with `can_approve_drivers = true`** |

## Required data (schema)
- **All users:** Israeli ID / **TZ** (`national_id`), **account status** (`pending`/`approved`/`rejected`).
- **Representatives:** `can_approve_drivers` boolean.
- **Drivers:** full name, location in Israel, birth year, gender, license type, license issuance year,
  **license photo** (Supabase Storage upload), consent-to-criminal-record-cert (bool),
  owns-private-vehicle-&-transports-ambulatory-patients (bool).

## Team (Domain Ownership)
| Domain | Owner |
|--------|-------|
| Backend & Security | **Daniel** |
| Infrastructure & Integrations | **Ronica** |
| Dispatcher Dashboard (FS1) | **Tomer** |
| Driver Interface (FS2) | **Ran** |
| Team Lead & Architecture | **Alin** |

> **"Super Admin"** maps to the existing `admin` value of the `public.user_role` enum. **Cross-team
> coordination** is expected (the team is cross-functional); advisor notes are called out per issue.

## Reconciliation with existing GitHub issues
- **Superseded by this plan** (rework or close — see #19): **#53** (direct-create driver via custom
  route), **#57** (representative *self*-registration), **#58** (representative login on custom auth).
- **Compatible / keep:** **#54** (driver management table), **#55**/**#56** (remove service zones —
  already absorbed below; new schema does **not** use `service_zone_id`).

## Suggested merge order
#1 schema → #2 RLS → #3 Auth config → #4 Storage → #5 middleware → #6 invite action →
#7 onboarding action → #8 approve/reject → (#10–#17 UI in parallel) → #9 custom-auth decommission →
#18 tests → #19 TL review/merge/docs.

---

## #1 — DB schema: new user/driver fields, status & permission flags, invitations table
**Assignee:** Daniel (Backend & Security) · **Depends on:** none · **Blocks:** #2, #6, #7, #8

**Description**
Add one migration introducing every new field and enum the registration flow needs.
- `public.users`: `national_id` (TZ, text, unique), `status public.account_status not null default 'pending'`,
  `can_approve_drivers boolean not null default false`.
- `public.drivers`: `location` (text), `birth_year` (int), `gender public.gender`, `license_type` (text),
  `license_issue_year` (int), `license_photo_path` (text), `consent_criminal_record boolean not null default false`,
  `owns_vehicle_ambulatory boolean not null default false`. (full name already lives on `public.users.full_name`.)
- New enums: `public.account_status` (`pending`,`approved`,`rejected`); `public.gender`
  (`male`,`female`,`other`,`prefer_not_to_say`).
- New `public.invitations` audit table: `id`, `email` (lower-unique while pending), `invited_role`,
  `invited_by` (FK users), `status` (`pending`/`accepted`/`expired`/`revoked`), `auth_user_id` (FK auth.users),
  `created_at`, `accepted_at`, `set_updated_at` trigger.
- **Backfill:** set existing users/drivers to `status = 'approved'` so current accounts keep working.

**Acceptance Criteria**
- [ ] Migration applies cleanly on local Docker Supabase and is reversible-safe (no data loss on existing rows).
- [ ] All new columns/enums exist with the defaults above; existing rows backfilled to `approved`.
- [ ] `national_id` is unique and not-null-enforced for new signups (nullable allowed only for legacy backfill — document).
- [ ] `invitations` table created with trigger.
- [ ] `supabase/ERD.md` updated.

**Technical Notes**
Migration under `supabase/migrations/`. Enums follow existing `public.user_role` style. TZ checksum
validation is enforced in the app/Server Action (see #7), not the DB. Do **not** reintroduce
`service_zone_id` (zones removed per #56).

---

## #2 — RLS policies: status gating + invite/approve permission rules
**Assignee:** Daniel (Backend & Security) · **Depends on:** #1 · **Blocks:** #6, #8

**Description**
Author RLS so the permission matrix and `pending` gating are enforced in the database, not just the UI.
- Only `status = 'approved'` users may read/write operational tables (rides, requests, etc.).
- Representatives: insertable/approvable only by `admin`.
- Drivers: insertable/approvable by `admin` **or** a representative whose `can_approve_drivers = true`.
- `invitations` RLS: admins full access; representatives may insert/read driver invites only when
  `can_approve_drivers = true`.

**Acceptance Criteria**
- [ ] A `pending` user is denied access to operational data via RLS (verified with seed users).
- [ ] A representative **without** `can_approve_drivers` cannot create/approve a driver (DB-level).
- [ ] A representative **cannot** approve another representative; only `admin` can.
- [ ] Admins/dispatchers retain full access; no RLS recursion.

**Technical Notes**
Extend `public.get_auth_user_role()` pattern (`20260523034000_implement_rls_policies.sql`); add a
`get_auth_user_status()` / `can_current_user_approve_drivers()` `security definer` helper. Keyed on
`auth.uid()` (works now that we use Supabase Auth sessions). **Needs Alin's RLS approval before merge.**

---

## #3 — Supabase Auth configuration (invite email, redirect, SMTP)
**Assignee:** Ronica (Infrastructure & Integrations) · **Depends on:** none · **Blocks:** #6, #14

**Description**
Stand up native Supabase Auth and the invite email path.
- Configure `supabase/config.toml`: Site URL, **redirect allow-list** including `/onboarding`,
  invite token lifetime, disable public sign-ups (invite-only).
- Customize the **invite** email template (link → `/onboarding`).
- Wire local mail (Inbucket) for testing; document production SMTP env vars (no secrets committed).

**Acceptance Criteria**
- [ ] A locally generated invite produces an Inbucket email whose link returns to `/onboarding` with a usable session.
- [ ] Public self-signup is disabled (invite-only).
- [ ] Required env documented: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, site/redirect URL.

**Technical Notes**
`supabase/config.toml` `[auth]` section. Service-role key already consumed by `lib/supabase.ts`.

---

## #4 — Supabase Storage: license-photo bucket + upload pipeline
**Assignee:** Ronica (Infrastructure & Integrations) · **Depends on:** #3 · **Blocks:** #15

**Description**
Provision secure storage for driver license photos and an upload path the onboarding form can use.
- Create a **private** bucket (e.g. `driver-license-photos`).
- Storage RLS: an invitee may upload only their own object; only admins / approving reps may read it.
- Provide an upload mechanism (signed upload URL or a Server Action) with **server-side validation**:
  content-type (jpeg/png/webp/pdf), max size, and path scoped to the user id.

**Acceptance Criteria**
- [ ] Bucket exists and is **not public**.
- [ ] A driver can upload exactly one license photo tied to their user id; cannot read others' files.
- [ ] Oversized / wrong-type uploads are rejected with a clear error.
- [ ] The stored object path is persisted to `drivers.license_photo_path` (written in #7).

**Technical Notes**
Supabase Storage + Storage RLS policies. Reuse the service-role client in `lib/supabase.ts` for
signing. Reuse `lib/rate-limit.ts` on the upload endpoint.

---

## #5 — Auth middleware, session helpers & authorization guards (Supabase Auth)
**Assignee:** Ronica (Infrastructure & Integrations) · **Depends on:** #3 · **Blocks:** #6, #8, #17, #18

**Description**
Replace the custom-token verification with Supabase Auth sessions and add reusable authorization
guards for the new permission matrix and status gating.
- New server/session helpers that read a real Supabase session (replace the custom path in
  `lib/api-auth.ts` `requireBearerAuth` / `verifyDriverToken`).
- Guards: `requireApproved()`, `requireAdmin()`, `requireCanInviteRole(role)` /
  `requireCanApproveDrivers()`.
- Rate limiting on invite/approve/upload endpoints.

**Acceptance Criteria**
- [ ] API routes authorize via Supabase session + `auth.uid()` (no custom HMAC verification).
- [ ] `pending`/`rejected` users are rejected by `requireApproved()` with a clear status code.
- [ ] Guards correctly distinguish admin vs representative-with-flag vs others.

**Technical Notes**
Touches `lib/api-auth.ts`, `lib/supabase.ts`, `lib/driver/session.ts`. Coordinate decommission of
`lib/auth/local-auth.ts` with Daniel (#9). **Advisor: Daniel** on the security review.

---

## #6 — Invite Server Action (Supabase Admin API) + permission enforcement
**Assignee:** Ronica (Infrastructure & Integrations) · **Depends on:** #1, #2, #5 · **Blocks:** #10

**Description**
Server action / route that issues invites through the Supabase Admin API and records them.
- Call `supabase.auth.admin.inviteUserByEmail(email, { data: { app_role, invited_by } })` with the
  **service-role** client.
- Enforce the permission matrix server-side (admin→representative; admin or rep-with-flag→driver).
- Insert a `pending` row in `invitations`; reject duplicate active users / pending invites (409).

**Acceptance Criteria**
- [ ] Invite stores `app_role` in user metadata and writes a `pending` invitation row.
- [ ] A representative without `can_approve_drivers` gets 403 when inviting a driver.
- [ ] A representative gets 403 when inviting a representative.
- [ ] Duplicate email (active user or pending invite) → 409; invalid email → 400.

**Technical Notes**
`createSupabaseClient()` (no token) in `lib/supabase.ts` = service role. Uses guards from #5.
**Advisor: Daniel** on metadata/RLS interplay.

---

## #7 — completeOnboarding Server Action (creates `pending` account + role data)
**Assignee:** Daniel (Backend & Security) · **Depends on:** #1, #4 · **Blocks:** #15, #13

**Description**
The action both onboarding forms submit to. Verifies the invite session, reads role from metadata
(never from the form), sets the password, and writes the profile transactionally with `status = 'pending'`.
- Set password via Supabase Auth (`auth.updateUser` / admin update).
- Upsert `public.users` (`full_name`, `phone`, `national_id`/TZ, `role = app_role`, `status = 'pending'`).
- If driver: insert `public.drivers` with all driver fields + `license_photo_path` from #4.
- If representative: no driver row; `can_approve_drivers` defaults false (set later by admin in #12).
- Mark the matching `invitations` row `accepted`.
- Validate: **TZ checksum** (Israeli ID), required fields, numeric year ranges, Israeli phone `+972`.

**Acceptance Criteria**
- [ ] Driver submission atomically creates `users` (pending) + `drivers` rows incl. license path; partial failure rolls back.
- [ ] Representative submission creates only the `users` row (pending).
- [ ] Invalid TZ checksum / missing required fields → friendly validation error, nothing written.
- [ ] Invitation marked `accepted`; role is taken from metadata, not the request body.

**Technical Notes**
Transaction pattern as in `app/api/auth/register-driver/route.ts`. **Advisor: Ronica** on storage path
handoff. This action **replaces** the old `register-driver` write path.

---

## #8 — Approve / Reject Server Action + permission enforcement
**Assignee:** Daniel (Backend & Security) · **Depends on:** #2, #5 · **Blocks:** #11

**Description**
Server action for the explicit approval step.
- `approve(userId)` → `status = 'approved'`; `reject(userId, reason?)` → `status = 'rejected'`.
- Enforce: admin approves representatives; admin or rep-with-`can_approve_drivers` approves drivers.
- Write an audit trail (who approved/rejected, when, reason).

**Acceptance Criteria**
- [ ] Approving flips status so the user can log in (verified end-to-end with #18 tests).
- [ ] Reject sets `rejected`; rejected users see the rejected screen and cannot log in.
- [ ] Permission matrix enforced server-side (403 on violation), independent of UI.

**Technical Notes**
Uses guards from #5 and RLS from #2 as defense-in-depth. Logs to an audit table or `invitations`/users
history — coordinate shape with Alin.

---

## #9 — Decommission custom auth & migrate existing accounts to Supabase Auth
**Assignee:** Daniel (Backend & Security) · **Depends on:** #5 · **Blocks:** #18 (before final merge)

**Description**
Remove the overridden custom-auth model and ensure existing drivers keep working on Supabase Auth.
- Remove/retire `lib/auth/local-auth.ts` (`signDriverToken`/`verifyDriverToken`) and the custom branch
  in `lib/api-auth.ts`.
- Retire/replace `app/api/auth/register-driver` and the custom `app/api/auth/login` JWT path.
- Migrate existing driver `auth.users` (passwords already in `encrypted_password`) so they authenticate
  via Supabase Auth; deprecate `public.users.password_hash`.
- Keep a documented rollback path.

**Acceptance Criteria**
- [ ] No code path mints or verifies the custom HMAC JWT.
- [ ] Existing drivers can log in via Supabase Auth and obtain a real session.
- [ ] `app/register-driver` and custom register/login routes removed or redirected to the new flow.
- [ ] `__tests__/driver-auth.test.ts` updated and green.

**Technical Notes**
Touches `lib/auth/local-auth.ts`, `lib/api-auth.ts`, `app/api/auth/*`, `lib/driver/session.ts`,
`lib/driver/api.ts`. **Coordinate timing with Alin** (shared auth surface; lands late in merge order).

---

## #10 — Invite UI (Super Admin → Representative; Rep-with-flag → Driver)
**Assignee:** Tomer (Dispatcher Dashboard / FS1) · **Depends on:** #6 · **Blocks:** —

**Description**
Role-gated page to send invites. The role options shown depend on the caller's permissions.
- Admin sees both "Invite Representative" and "Invite Driver".
- Representative with `can_approve_drivers` sees only "Invite Driver"; others see no invite UI.
- Fields: email + role; submit → invite action (#6); success/error toasts.
- Add an "Invitations" entry to `SidebarNav`.

**Acceptance Criteria**
- [ ] Admin can invite either role; rep-with-flag can invite only drivers; unauthorized roles can't reach the page.
- [ ] Server validation/permission errors surface as toasts (no page crash).
- [ ] Optional: recent invitations list with status.

**Technical Notes**
Style reference `app/dispatcher/requests/new/NewRequestForm.tsx`; nav at
`app/dispatcher/SidebarNav.tsx`. Calls the action from #6.

---

## #11 — Approval queue UI (review / approve / reject pending registrations)
**Assignee:** Tomer (Dispatcher Dashboard / FS1) · **Depends on:** #8 · **Blocks:** —

**Description**
Page listing `pending` registrations the current user is allowed to review, showing the submitted
form data (incl. driver license photo) with Approve / Reject actions.
- Admin sees pending representatives **and** drivers; rep-with-flag sees pending drivers only.
- Reject prompts for an optional reason.

**Acceptance Criteria**
- [ ] List shows only registrations the viewer may approve (matrix-correct).
- [ ] Driver rows display submitted fields + license photo (via signed read URL).
- [ ] Approve activates the account; Reject marks it rejected; both update the list without full reload.

**Technical Notes**
Reads pending users; license photo via signed URL from #4. Calls approve/reject action (#8).

---

## #12 — Manage representative permissions UI (`can_approve_drivers`)
**Assignee:** Tomer (Dispatcher Dashboard / FS1) · **Depends on:** #1, #2 · **Blocks:** —

**Description**
Admin-only screen to toggle `can_approve_drivers` on representative accounts.

**Acceptance Criteria**
- [ ] Admin can list representatives and toggle the flag; change persists.
- [ ] Non-admins cannot access the screen or the underlying mutation (403).
- [ ] Toggling updates a rep's ability to invite/approve drivers immediately.

**Technical Notes**
Mutation via `PATCH /api/users/[id]` or a dedicated server action; gated by `requireAdmin()` (#5) + RLS (#2).

---

## #13 — Representative onboarding form UI
**Assignee:** Tomer (Dispatcher Dashboard / FS1) · **Depends on:** #7, #14 · **Blocks:** —

**Description**
The representative variant rendered inside the onboarding shell (#14): password + TZ (`national_id`),
full name, phone. Submits to completeOnboarding (#7), then shows the pending screen (#16).

**Acceptance Criteria**
- [ ] Client validation: password length, TZ checksum, required fields, Israeli phone.
- [ ] Successful submit creates a `pending` representative and routes to the pending screen.
- [ ] Server errors surface inline.

**Technical Notes**
Plugs into the role-routing shell from #14. **Advisor: Ran** (shares the onboarding shell).

---

## #14 — Onboarding shell: invite-link session exchange + role-based routing
**Assignee:** Ran (Driver Interface / FS2) · **Depends on:** #3, #5 · **Blocks:** #13, #15, #16

**Description**
New `/onboarding` route that establishes the Supabase session from the invite link, reads `app_role`
from metadata, and renders the correct form (Driver #15 vs Representative #13).

**Acceptance Criteria**
- [ ] Clicking the emailed link lands on `/onboarding` with an active session.
- [ ] Driver invites render the driver form; representative invites render the representative form.
- [ ] Invalid/expired link shows a clear error, not a crash.

**Technical Notes**
GoTrue token/`code` exchange via `lib/supabase-browser.ts`. Provides the container both form issues plug into.

---

## #15 — Driver onboarding form UI + license photo upload
**Assignee:** Ran (Driver Interface / FS2) · **Depends on:** #4, #7, #14 · **Blocks:** —

**Description**
The driver variant: password + TZ (`national_id`), full name, location in Israel, birth year, gender,
license type, license issuance year, **license photo upload**, consent-to-criminal-record checkbox,
owns-vehicle-&-ambulatory checkbox. Submits to completeOnboarding (#7) → pending screen (#16).

**Acceptance Criteria**
- [ ] All fields present with client validation (TZ checksum, year ranges, required photo, required consent boxes as specified).
- [ ] License photo uploads to the private bucket (#4) before/with submit; rejected files show a clear error.
- [ ] Successful submit creates a `pending` driver (+ `drivers` row) and routes to the pending screen.

**Technical Notes**
Upload via the mechanism from #4; store returned path for #7. Mobile-friendly (driver single-use case).

---

## #16 — "Pending approval" gate + status screens
**Assignee:** Ran (Driver Interface / FS2) · **Depends on:** #2, #5 · **Blocks:** —

**Description**
Screens and gating for the account lifecycle.
- After onboarding submit: *"Registration received, waiting for system approval."*
- `pending` users are blocked from the main app; `rejected` users see a rejected screen; `approved`
  users proceed to their dashboard.

**Acceptance Criteria**
- [ ] Pending users cannot reach driver/dispatcher app routes (redirected to the waiting screen).
- [ ] Rejected users see the rejected state and a contact/next-step message.
- [ ] On approval, the next login routes the user to the correct dashboard.

**Technical Notes**
Client guards + server `requireApproved()` (#5) + RLS (#2) as defense-in-depth.

---

## #17 — Login via Supabase Auth + status gating + role redirect
**Assignee:** Ran (Driver Interface / FS2) · **Depends on:** #5, #9 · **Blocks:** —

**Description**
Replace driver/representative login with Supabase Auth sessions.
- Email + password → Supabase Auth session.
- `pending`/`rejected` accounts get a clear status message (not a generic 401).
- Redirect by role: driver → `/driver/dashboard`; representative/admin → `/dispatcher/dashboard`.

**Acceptance Criteria**
- [ ] All users authenticate through Supabase Auth; session persists across refresh.
- [ ] Pending/rejected accounts get a specific message.
- [ ] Role-based redirect works; the old `/login` driver-JWT path is removed (per #9).

**Technical Notes**
Coordinate with Daniel (#9) on removing custom login routes. Uses `lib/supabase-browser.ts`.

---

## #18 — Test suite: invites, onboarding, approval, gating, migration
**Assignee:** Distributed — each domain tests its slice; **Daniel coordinates CI** · **Depends on:** #6, #7, #8, #9 · **Blocks:** —

**Description**
Cover the permission matrix and lifecycle following the `__tests__/` pattern.
- Invite: metadata role; matrix (admin vs rep-with-flag vs others); duplicate/invalid email; rate limit.
- Onboarding: driver path (users+drivers+photo atomic), rep path; TZ checksum; rollback on partial failure.
- Approval: approve enables login; reject blocks; permission enforcement.
- Gating: pending/rejected denied by RLS and middleware.
- Migration: existing driver still authenticates post-decommission.

**Acceptance Criteria**
- [ ] New tests pass in CI alongside `users.test.ts`, `drivers.test.ts`, `driver-auth.test.ts`.
- [ ] Storage RLS tested (no cross-user reads).

**Technical Notes**
Reuse the local Docker Supabase integration harness and seed users.

---

## #19 — TL: architecture sign-off, merge strategy, issue reconciliation, docs
**Assignee:** Alin (Team Lead & Architecture) · **Depends on:** all · **Blocks:** release

**Description**
- Approve the Supabase-Auth direction, the schema (#1) and **RLS (#2)** before they merge.
- Enforce the merge order; ensure auth decommission (#9) lands late and tested.
- **Reconcile existing GitHub issues:** rework/close **#53** (direct-create driver), **#57** (rep
  self-register), **#58** (rep custom login) as superseded; confirm **#54/#55/#56** stay.
- Docs: "Invite a user", "Complete your onboarding" (driver & rep), "Approve a registration".

**Acceptance Criteria**
- [ ] Schema + RLS reviewed and approved; PRs merged in order.
- [ ] Superseded issues closed/relabelled with a pointer to this plan.
- [ ] Staff-facing docs published; feature demoable end-to-end (invite → onboard → pending → approve → login).

**Technical Notes**
Keep `dev` as the working branch; merge to `main` once each slice is tested (per `REVISED_PLAN.md`).
