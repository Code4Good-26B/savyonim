# Savyonim Dispatch ERD

> Regenerated from the live schema on 2026-06-27 (local Docker Supabase, all migrations applied).
> Covers the `public` schema. `auth.*` (Supabase Auth) is external and not drawn.

```mermaid
erDiagram
    users {
        uuid id PK
        text full_name
        text phone
        user_role role
        boolean is_active
        text email "UK (unique on lower(email) where not null)"
        text password_hash "legacy / being decommissioned"
        text national_id "UK (unique where not null)"
        account_status status
        boolean can_approve_drivers
        timestamptz created_at
        timestamptz updated_at
    }

    invitations {
        uuid id PK
        text email "UK while status = pending (lower(email))"
        user_role invited_role
        uuid invited_by FK
        invitation_status status
        uuid auth_user_id "FK -> auth.users (external)"
        timestamptz created_at
        timestamptz accepted_at
        timestamptz updated_at
    }

    drivers {
        uuid id PK
        uuid user_id UK,FK
        text contact_phone
        uuid service_zone_id FK "retained, not currently used"
        boolean is_active
        text vehicle_make
        text vehicle_model
        text vehicle_plate
        text vehicle_color
        integer vehicle_seats
        text location
        integer birth_year
        gender gender
        text license_type
        integer license_issue_year
        text license_photo_path
        boolean consent_criminal_record
        boolean owns_vehicle_ambulatory
        timestamptz created_at
        timestamptz updated_at
    }

    ambulances {
        uuid id PK
        text license_plate UK
        uuid service_zone_id FK "retained, not currently used"
        boolean is_available
        boolean is_active
        text ambulance_type
        timestamptz created_at
        timestamptz updated_at
    }

    passengers {
        uuid id PK
        text national_id UK
        text full_name
        passenger_category category
        mobility_requirement mobility_need
        text mobility_notes
        text phone
        text emergency_contact
        timestamptz created_at
        timestamptz updated_at
    }

    service_zones {
        uuid id PK
        text name UK
        text region_code UK
        text region
        text city
        boolean get_all
        jsonb address_list
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ride_requests {
        uuid id PK
        uuid passenger_id FK
        uuid requested_by_user_id FK
        uuid service_zone_id FK "retained, not currently used"
        request_status status
        text source_address
        text source_notes
        text destination_address
        text destination_notes
        boolean return_trip_required
        boolean request_for_self
        text caller_full_name
        text caller_id_number
        text caller_phone
        text trip_type
        timestamptz requested_pickup_at
        timestamptz requested_arrival_at
        timestamptz estimated_departure_at
        integer waiting_time_minutes
        time leisure_window_start
        time leisure_window_end
        timestamptz approved_at
        timestamptz assigned_at
        timestamptz started_at
        timestamptz completed_at
        timestamptz rejected_at
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
    }

    rides {
        uuid id PK
        uuid ride_request_id FK
        uuid driver_id FK
        uuid ambulance_id FK
        uuid assigned_by_user_id FK
        uuid representative_user_id FK
        ride_status status
        numeric odometer_start_km
        numeric odometer_end_km
        timestamptz assigned_at
        timestamptz in_progress_at
        timestamptz completed_at
        timestamptz rejected_at
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
    }

    users ||--o{ ride_requests : requested_by
    users ||--o{ rides : assigned_by
    users ||--o{ rides : representative
    users ||--|| drivers : profile
    users ||--o{ invitations : invited_by
    service_zones ||--o{ drivers : covers
    service_zones ||--o{ ambulances : contains
    service_zones ||--o{ ride_requests : request_zone
    passengers ||--o{ ride_requests : submits
    ride_requests ||--o{ rides : operational_attempts
    drivers ||--o{ rides : drives
    ambulances ||--o{ rides : vehicle
```

## Service zones (kept, currently unused)

`service_zones` and the `service_zone_id` foreign keys on `drivers`, `ambulances`, and
`ride_requests` are **intentionally retained in the database** for possible future use, but the
application does **not** use zone-based routing today (zones are out of MVP scope). They are kept so
the feature can be re-enabled later without a schema migration.

## Operational helper table (not shown above)

- `keep_alive` (`id` PK) — a small table written by the keep-alive cron so the hosted database isn't
  paused for inactivity. No relationships; not part of the domain model.

## Status flow

`ride_requests.status` lifecycle:

`pending -> approved -> waiting_for_representative -> in_progress -> completed`

`rides.status` lifecycle:

`assigned -> in_progress -> completed`

Either may transition to `rejected` from any non-terminal state per business handling.

## Race-condition guardrails

Partial unique indexes on `rides` block conflicting concurrent assignments at the DB level:

- `ux_rides_active_request` — one active ride per `ride_request_id` where status is `assigned` or `in_progress`.
- `ux_rides_active_ambulance` — one active ride per `ambulance_id` where status is `assigned` or `in_progress`.

Other conditional unique indexes:

- `users` — unique `lower(email)` where email is not null (`ux_users_email_lower`); unique `national_id` where not null (`unique_national_id`).
- `invitations` — unique `lower(email)` while `status = 'pending'` (`unique_pending_email`).

## Enum values

- `user_role`: `admin`, `driver`, `representative`
- `account_status`: `pending`, `approved`, `rejected`
- `invitation_status`: `pending`, `accepted`, `expired`, `revoked`
- `gender`: `male`, `female`, `other`, `prefer_not_to_say`
- `passenger_category`: `wounded_soldier`, `idf_disabled`, `holocaust_survivor`, `cancer_patient`, `dialysis_patient`, `other`
- `mobility_requirement`: `none`, `wheelchair`, `walker`, `cane`, `walking`
- `request_status`: `pending`, `approved`, `waiting_for_representative`, `in_progress`, `completed`, `rejected`
- `ride_status`: `assigned`, `in_progress`, `completed`, `rejected`
