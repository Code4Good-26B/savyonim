-- Allow one driver to hold multiple active rides.
-- The active ride_request and ambulance uniqueness constraints still prevent
-- duplicate accepts for the same request and conflicting ambulance assignment.
drop index if exists public.ux_rides_active_driver;
