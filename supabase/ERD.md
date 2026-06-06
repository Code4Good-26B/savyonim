# Savyonim Dispatch ERD

```mermaid
erDiagram
    users {
        uuid id PK
        text full_name
        text phone
        user_role role
        boolean is_active
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

    drivers {
        uuid id PK
        uuid user_id UK,FK
        text contact_phone
        uuid service_zone_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ambulances {
        uuid id PK
        text license_plate UK
        uuid service_zone_id FK
        boolean is_available
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    passengers {
        uuid id PK
        text national_id UK
        text full_name
        text category
        mobility_requirement mobility_need
        text mobility_notes
        text phone
        text emergency_contact
        timestamptz created_at
        timestamptz updated_at
    }

    ride_requests {
        uuid id PK
        uuid passenger_id FK
        uuid requested_by_user_id FK
        uuid service_zone_id FK
        request_status status
        text source_address
        text destination_address
        boolean return_trip_required
        timestamptz requested_pickup_at
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
        uuid representitive_user_id FK
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
    service_zones ||--o{ ride_requests : request_zone
    users ||--o{ rides : assigned_by
    users ||--o{ rides : representitive
    users ||--|| drivers : profile
    service_zones ||--o{ drivers : covers
    service_zones ||--o{ ambulances : contains
    passengers ||--o{ ride_requests : submits
    ride_requests ||--o{ rides : operational_attempts
    drivers ||--o{ rides : drives
    ambulances ||--o{ rides : vehicle
```

## Status Flow

`ride_requests.status` is constrained to this lifecycle:

`pending -> approved -> waiting_for_representitive -> in_progress -> completed`

A request may transition to `rejected` from any non-terminal operational state according to business handling.

## Race-Condition Guardrails

The migration includes partial unique indexes on active rides:

- One active ride per request (`ride_request_id`) where status is `assigned` or `in_progress`.
- One active ride per driver (`driver_id`) where status is `assigned` or `in_progress`.
- One active ride per ambulance (`ambulance_id`) where status is `assigned` or `in_progress`.

These constraints block conflicting concurrent assignments at the database level.

## Enum Values

- `user_role`: `admin`, `dispatcher`, `driver`, `representative`
- `request_status`: `pending`, `approved`, `waiting_for_representitive`, `in_progress`, `completed`, `rejected`
- `mobility_requirement`: `none`, `wheelchair`, `walker`, `cane`
