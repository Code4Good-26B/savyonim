-- 1. Fix mutable search paths on foundational schema trigger functions
alter function public.set_updated_at() set search_path = public;
alter function public.enforce_request_status_transition() set search_path = public;
alter function public.sync_request_status_from_ride() set search_path = public;

-- 2. Revoke execute on elevated SECURITY DEFINER function from public/anon/authenticated roles
-- This blocks RPC discovery and ensures it is only callable internally by RLS policy engines
revoke execute on function public.get_auth_user_role() from public, anon, authenticated;

-- 3. Optimize RLS policies using subquery (InitPlan) select auth.uid() checks for high-scale performance
-- Recreating policies with optimized checks

-- Users
drop policy if exists "Users can read their own user record" on public.users;
create policy "Users can read their own user record"
on public.users
for select
using (
  id = (select auth.uid())
);

-- Drivers
drop policy if exists "Drivers can read their own driver profile" on public.drivers;
create policy "Drivers can read their own driver profile"
on public.drivers
for select
using (
  user_id = (select auth.uid())
);

-- Service Zones
drop policy if exists "All authenticated users can read service zones" on public.service_zones;
create policy "All authenticated users can read service zones"
on public.service_zones
for select
using (
  (select auth.uid()) is not null
);

-- Ride Requests
drop policy if exists "Drivers can read ride requests linked to their assigned rides" on public.ride_requests;
create policy "Drivers can read ride requests linked to their assigned rides"
on public.ride_requests
for select
using (
  exists (
    select 1
    from public.rides r
    join public.drivers d on r.driver_id = d.id
    where r.ride_request_id = public.ride_requests.id
      and d.user_id = (select auth.uid())
  )
);

-- Rides
drop policy if exists "Drivers can read their own assigned rides" on public.rides;
create policy "Drivers can read their own assigned rides"
on public.rides
for select
using (
  exists (
    select 1
    from public.drivers d
    where d.id = public.rides.driver_id
      and d.user_id = (select auth.uid())
  )
);
