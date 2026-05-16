import { query } from "@/lib/db";

export const runtime = "nodejs";

const REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, service_zone_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason";

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
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");
  const serviceZoneId = searchParams.get("serviceZoneId");

  if (!driverId) {
    return Response.json({ error: "driverId is required" }, { status: 400 });
  }

  const openRides = await query<RideRequestRow>(
    `
      select ${REQUEST_FIELDS}
      from public.ride_requests
      where status = 'approved'
        and ($1::uuid is null or service_zone_id = $1::uuid)
      order by requested_pickup_at asc nulls last
    `,
    [serviceZoneId],
  );

  const assignedRides = await query<RideRow>(
    `
      select
        ${RIDE_SELECT},
        to_jsonb(rr.*) as ride_request
      from public.rides r
      left join public.ride_requests rr on rr.id = r.ride_request_id
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
        to_jsonb(rr.*) as ride_request
      from public.rides r
      left join public.ride_requests rr on rr.id = r.ride_request_id
      where r.driver_id = $1::uuid
        and r.status in ('completed', 'rejected')
      order by coalesce(r.completed_at, r.rejected_at, r.assigned_at) desc
    `,
    [driverId],
  );

  return Response.json({
    openRides: openRides.rows,
    assignedRides: assignedRides.rows,
    rideHistory: rideHistory.rows,
  });
}
