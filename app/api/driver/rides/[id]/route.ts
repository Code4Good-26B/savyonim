import { query } from "@/lib/db";
import { requireDriverAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

const REQUEST_FIELDS =
  "id, passenger_id, requested_by_user_id, service_zone_id, status, source_address, source_notes, destination_address, destination_notes, return_trip_required, requested_pickup_at, approved_at, assigned_at, started_at, completed_at, rejected_at, rejection_reason";

const RIDE_FIELDS =
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireDriverAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const driverId = auth.driver.driverId;

  const ride = await query<RideRow>(
    `
      select
        ${RIDE_FIELDS},
        to_jsonb(rr.*) as ride_request
      from public.rides r
      left join public.ride_requests rr on rr.id = r.ride_request_id
      where r.id = $1::uuid
        and r.driver_id = $2::uuid
      limit 1
    `,
    [id, driverId],
  );

  if (ride.rows[0]) return Response.json({ kind: "assigned", ride: ride.rows[0] });

  const rideRequest = await query<RideRequestRow>(
    `
      select ${REQUEST_FIELDS}
      from public.ride_requests
      where id = $1::uuid
        and status = 'approved'
        and (
          select d.service_zone_id is null or ride_requests.service_zone_id = d.service_zone_id
          from public.drivers d
          where d.id = $2::uuid
        )
      limit 1
    `,
    [id, driverId],
  );

  if (!rideRequest.rows[0]) {
    return Response.json({ error: "Ride not found for this driver" }, { status: 404 });
  }

  return Response.json({ kind: "open", rideRequest: rideRequest.rows[0] });
}
