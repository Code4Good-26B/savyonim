import { query } from "@/lib/db";
import { DashboardClient, type DashboardDriver, type DashboardRide } from "./DashboardClient";

export const dynamic = "force-dynamic";

type DriverRow = {
  id: string;
  full_name: string;
  contact_phone: string | null;
  is_active: boolean;
  ride_status: "assigned" | "in_progress" | null;
  total_rides: string | number;
};

type RideRow = {
  id: string;
  caller_full_name: string | null;
  caller_phone: string | null;
  source_address: string;
  destination_address: string;
  status: string;
  requested_pickup_at: string | null;
  driver_name: string | null;
};

function formatTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatsRow = {
  pending_rides: string;
  active_rides: string;
};

export default async function DispatcherDashboard() {
  const [driversResult, ridesResult, statsResult] = await Promise.all([
    query<DriverRow>(`
      SELECT
        d.id,
        u.full_name,
        d.contact_phone,
        d.is_active,
        r.status AS ride_status,
        (SELECT count(*) FROM public.rides cr
           WHERE cr.driver_id = d.id AND cr.status = 'completed') AS total_rides
      FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      LEFT JOIN public.rides r
        ON r.driver_id = d.id
        AND r.status IN ('assigned', 'in_progress')
      ORDER BY
        CASE WHEN d.is_active THEN 0 ELSE 1 END,
        u.full_name
    `),
    query<RideRow>(`
      SELECT
        rr.id,
        rr.caller_full_name,
        rr.caller_phone,
        rr.source_address,
        rr.destination_address,
        rr.status,
        rr.requested_pickup_at,
        du.full_name AS driver_name
      FROM public.ride_requests rr
      LEFT JOIN public.rides r
        ON r.ride_request_id = rr.id
        AND r.status IN ('assigned', 'in_progress', 'completed')
      LEFT JOIN public.drivers d ON d.id = r.driver_id
      LEFT JOIN public.users du ON du.id = d.user_id
      ORDER BY rr.requested_pickup_at DESC NULLS LAST
      LIMIT 10
    `),
    query<StatsRow>(`
      SELECT
        (SELECT count(*)::text FROM public.ride_requests WHERE status = 'pending') AS pending_rides,
        (SELECT count(*)::text FROM public.rides WHERE status IN ('assigned', 'in_progress')) AS active_rides
    `),
  ]);

  const drivers: DashboardDriver[] = driversResult.rows.map((d) => ({
    id: d.id,
    name: d.full_name,
    phone: d.contact_phone,
    status: !d.is_active ? "inactive" : d.ride_status ? "busy" : "available",
    totalRides: Number(d.total_rides) || 0,
  }));

  const rides: DashboardRide[] = ridesResult.rows.map((r) => ({
    id: r.id,
    passenger: r.caller_full_name,
    phone: r.caller_phone,
    pickup: r.source_address,
    dropoff: r.destination_address,
    driver: r.driver_name,
    status: r.status,
    requestedTime: formatTime(r.requested_pickup_at),
  }));

  const stats = {
    pendingRides: parseInt(statsResult.rows[0]?.pending_rides ?? "0", 10),
    activeRides: parseInt(statsResult.rows[0]?.active_rides ?? "0", 10),
    availableDrivers: drivers.filter((d) => d.status === "available").length,
  };

  return <DashboardClient drivers={drivers} rides={rides} stats={stats} />;
}
