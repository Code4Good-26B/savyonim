-- Issue #40 + #43 completion scaffold:
-- - Add travel request fields and enums
-- - Add atomic intake RPC used by /api/intake/ride-request

-- 1) Passenger category enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'passenger_category'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.passenger_category AS ENUM (
      'wounded_soldier',
      'idf_disabled',
      'holocaust_survivor',
      'cancer_patient',
      'dialysis_patient',
      'other'
    );
  END IF;
END $$;

-- Normalize existing free-text categories before conversion.
UPDATE public.passengers
SET category = 'other'
WHERE category IS NULL
   OR category NOT IN (
     'wounded_soldier',
     'idf_disabled',
     'holocaust_survivor',
     'cancer_patient',
     'dialysis_patient',
     'other'
   );

ALTER TABLE public.passengers
  ALTER COLUMN category TYPE public.passenger_category
  USING category::public.passenger_category;

-- 2) mobility_requirement enum update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'mobility_requirement'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'walking'
  ) THEN
    ALTER TYPE public.mobility_requirement ADD VALUE 'walking';
  END IF;
END $$;

-- 3) Add new ride_request intake columns
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS caller_full_name text,
  ADD COLUMN IF NOT EXISTS caller_id_number text,
  ADD COLUMN IF NOT EXISTS caller_phone text,
  ADD COLUMN IF NOT EXISTS request_for_self boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trip_type text,
  ADD COLUMN IF NOT EXISTS requested_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_departure_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiting_time_minutes integer,
  ADD COLUMN IF NOT EXISTS leisure_window_start time,
  ADD COLUMN IF NOT EXISTS leisure_window_end time;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ride_requests_trip_type_check'
      AND conrelid = 'public.ride_requests'::regclass
  ) THEN
    ALTER TABLE public.ride_requests
      ADD CONSTRAINT ride_requests_trip_type_check
      CHECK (trip_type IN ('medical', 'leisure') OR trip_type IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ride_requests_waiting_time_positive_check'
      AND conrelid = 'public.ride_requests'::regclass
  ) THEN
    ALTER TABLE public.ride_requests
      ADD CONSTRAINT ride_requests_waiting_time_positive_check
      CHECK (waiting_time_minutes IS NULL OR waiting_time_minutes > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ride_requests_trip_type
  ON public.ride_requests (trip_type);

CREATE INDEX IF NOT EXISTS idx_ride_requests_caller_phone
  ON public.ride_requests (caller_phone);

-- 4) Transactional RPC for intake route
CREATE OR REPLACE FUNCTION public.create_intake_ride_request(
  p_caller_full_name text,
  p_caller_id_number text,
  p_caller_phone text,
  p_request_for_self boolean,
  p_passenger_full_name text,
  p_passenger_national_id text,
  p_passenger_phone text,
  p_passenger_emergency_contact text,
  p_passenger_mobility_need public.mobility_requirement,
  p_passenger_category public.passenger_category,
  p_trip_type text,
  p_source_address text,
  p_destination_address text,
  p_requested_pickup_at timestamptz,
  p_requested_arrival_at timestamptz,
  p_estimated_departure_at timestamptz,
  p_waiting_time_minutes integer,
  p_leisure_window_start time,
  p_leisure_window_end time,
  p_return_trip_required boolean,
  p_service_zone_id uuid
)
RETURNS TABLE(ride_request_id uuid, passenger_id uuid, status public.request_status)
LANGUAGE plpgsql
AS $$
DECLARE
  v_passenger_id uuid;
BEGIN
  IF p_request_for_self THEN
    SELECT id
    INTO v_passenger_id
    FROM public.passengers
    WHERE national_id = p_caller_id_number
    LIMIT 1;

    IF v_passenger_id IS NULL THEN
      INSERT INTO public.passengers (
        full_name,
        national_id,
        phone,
        mobility_need,
        category
      )
      VALUES (
        p_caller_full_name,
        p_caller_id_number,
        p_caller_phone,
        COALESCE(p_passenger_mobility_need, 'walking'::public.mobility_requirement),
        COALESCE(p_passenger_category, 'other'::public.passenger_category)
      )
      RETURNING id INTO v_passenger_id;
    END IF;
  ELSE
    SELECT id
    INTO v_passenger_id
    FROM public.passengers
    WHERE national_id = p_passenger_national_id
    LIMIT 1;

    IF v_passenger_id IS NULL THEN
      INSERT INTO public.passengers (
        full_name,
        national_id,
        phone,
        emergency_contact,
        mobility_need,
        category
      )
      VALUES (
        p_passenger_full_name,
        p_passenger_national_id,
        p_passenger_phone,
        p_passenger_emergency_contact,
        p_passenger_mobility_need,
        p_passenger_category
      )
      RETURNING id INTO v_passenger_id;
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.ride_requests (
    passenger_id,
    service_zone_id,
    source_address,
    destination_address,
    return_trip_required,
    requested_pickup_at,
    caller_full_name,
    caller_id_number,
    caller_phone,
    request_for_self,
    trip_type,
    requested_arrival_at,
    estimated_departure_at,
    waiting_time_minutes,
    leisure_window_start,
    leisure_window_end
  )
  VALUES (
    v_passenger_id,
    p_service_zone_id,
    p_source_address,
    p_destination_address,
    p_return_trip_required,
    p_requested_pickup_at,
    p_caller_full_name,
    p_caller_id_number,
    p_caller_phone,
    p_request_for_self,
    p_trip_type,
    p_requested_arrival_at,
    p_estimated_departure_at,
    p_waiting_time_minutes,
    p_leisure_window_start,
    p_leisure_window_end
  )
  RETURNING id, v_passenger_id, status;
END;
$$;
