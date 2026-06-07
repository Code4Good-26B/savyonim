import { query } from "@/lib/db";
import { requireDriverAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

const REQUEST_FIELDS =
  "rr.id, rr.passenger_id, rr.requested_by_user_id, rr.service_zone_id, rr.status, rr.source_address, rr.source_notes, rr.destination_address, rr.destination_notes, rr.return_trip_required, rr.requested_pickup_at, rr.approved_at, rr.assigned_at, rr.started_at, rr.completed_at, rr.rejected_at, rr.rejection_reason, rr.caller_full_name, rr.caller_id_number, rr.caller_phone, rr.request_for_self, rr.trip_type, rr.requested_arrival_at, rr.estimated_departure_at, rr.waiting_time_minutes, rr.leisure_window_start, rr.leisure_window_end";

const RIDE_SELECT =
  "r.id, r.ride_request_id, r.driver_id, r.ambulance_id, r.assigned_by_user_id, r.representitive_user_id, r.status, r.assigned_at, r.in_progress_at, r.completed_at, r.rejected_at, r.rejection_reason, r.odometer_start_km, r.odometer_end_km";

type RideRequestRow = {
  id: string;
  passenger_id: string;
  requested_by_user_id: string | null;
  service_zone_id: string | null;
  status: string;
  source_address: string;
  source_notes: string | null;
  destination_address: string;
  destination_notes: string | null;
  return_trip_required: boolean;
  requested_pickup_at: string | null;
  approved_at: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  caller_full_name: string | null;
  caller_id_number: string | null;
  caller_phone: string | null;
  request_for_self: boolean;
  trip_type: string | null;
  requested_arrival_at: string | null;
  estimated_departure_at: string | null;
  waiting_time_minutes: number | null;
  leisure_window_start: string | null;
  leisure_window_end: string | null;
  passenger: {
    id: string;
    full_name: string;
    phone: string | null;
    emergency_contact: string | null;
    mobility_need: string;
    category: string | null;
  } | null;
};

type RideRow = {
  id: string;
  ride_request_id: string;
  driver_id: string;
  ambulance_id: string;
  assigned_by_user_id: string | null;
  representitive_user_id: string | null;
  status: string;
  assigned_at: string | null;
  in_progress_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  odometer_start_km: string | null;
  odometer_end_km: string | null;
  ride_request: RideRequestRow | null;
};

export async function GET(request: Request) {
  const auth = requireDriverAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const driverId = auth.driver.driverId;

  const openRides = await query<RideRequestRow>(
    `
      select ${REQUEST_FIELDS}
        , case
            when p.id is null then null
            else jsonb_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'phone', p.phone,
              'emergency_contact', p.emergency_contact,
              'mobility_need', p.mobility_need,
              'category', p.category
            )
          end as passenger
      from public.ride_requests rr
      left join public.passengers p on p.id = rr.passenger_id
      where rr.status = 'approved'
        and (
          select d.service_zone_id is null or rr.service_zone_id = d.service_zone_id
          from public.drivers d
          where d.id = $1::uuid
        )
      order by rr.requested_pickup_at asc nulls last
    `,
    [driverId],
  );

  const assignedRides = await query<RideRow>(
    `
      select
        ${RIDE_SELECT},
        to_jsonb(rr.*) || jsonb_build_object(
          'passenger',
          case
            when p.id is null then null
            else jsonb_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'phone', p.phone,
              'emergency_contact', p.emergency_contact,
              'mobility_need', p.mobility_need,
              'category', p.category
            )
          end
        ) as ride_request
      from public.rides r
      left join public.ride_requests rr on rr.id = r.ride_request_id
      left join public.passengers p on p.id = rr.passenger_id
      where r.driver_id = $1::uuid
        and r.status in ('assigned', 'in_progress')
      order by r.assigned_at desc
    `,
    [driverId],
  );

  const rideHistory = await query<RideRow>(
    `
      select
        ${RIDE_SELECT},
        to_jsonb(rr.*) || jsonb_build_object(
          'passenger',
          case
            when p.id is null then null
            else jsonb_build_object(
              'id', p.id,
              'full_name', p.full_name,
              'phone', p.phone,
              'emergency_contact', p.emergency_contact,
              'mobility_need', p.mobility_need,
              'category', p.category
            )
          end
        ) as ride_request
      from public.rides r
      left join public.ride_requests rr on rr.id = r.ride_request_id
      left join public.passengers p on p.id = rr.passenger_id
      where r.driver_id = $1::uuid
        and r.status = 'completed'
      order by coalesce(r.completed_at, r.assigned_at) desc
    `,
    [driverId],
  );

  return Response.json({
    openRides: openRides.rows,
    assignedRides: assignedRides.rows,
    rideHistory: rideHistory.rows,
  });
}
