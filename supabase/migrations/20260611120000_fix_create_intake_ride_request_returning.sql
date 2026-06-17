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
  RETURNING ride_requests.id, v_passenger_id, ride_requests.status;
END;
$$;
