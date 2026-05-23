-- Helper to securely retrieve the current user's role bypassing RLS to avoid infinite recursion
create or replace function public.get_auth_user_role()
returns public.user_role
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  r_role public.user_role;
begin
  select role into r_role
  from public.users
  where id = auth.uid();
  return r_role;
end;
$$;

-- -------------------------------------------------------------
-- 1. Users policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on users"
on public.users
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

create policy "Users can read their own user record"
on public.users
for select
using (
  id = auth.uid()
);

-- -------------------------------------------------------------
-- 2. Drivers policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on drivers"
on public.drivers
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

create policy "Drivers can read their own driver profile"
on public.drivers
for select
using (
  user_id = auth.uid()
);

-- -------------------------------------------------------------
-- 3. Ambulances policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on ambulances"
on public.ambulances
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

-- -------------------------------------------------------------
-- 4. Passengers policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on passengers"
on public.passengers
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

-- -------------------------------------------------------------
-- 5. Service Zones policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on service_zones"
on public.service_zones
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

create policy "All authenticated users can read service zones"
on public.service_zones
for select
using (
  auth.uid() is not null
);

-- -------------------------------------------------------------
-- 6. Ride Requests policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on ride_requests"
on public.ride_requests
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

create policy "Drivers can read ride requests linked to their assigned rides"
on public.ride_requests
for select
using (
  exists (
    select 1
    from public.rides r
    join public.drivers d on r.driver_id = d.id
    where r.ride_request_id = public.ride_requests.id
      and d.user_id = auth.uid()
  )
);

-- -------------------------------------------------------------
-- 7. Rides policies
-- -------------------------------------------------------------
create policy "Admins and dispatchers can do anything on rides"
on public.rides
for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

create policy "Drivers can read their own assigned rides"
on public.rides
for select
using (
  exists (
    select 1
    from public.drivers d
    where d.id = public.rides.driver_id
      and d.user_id = auth.uid()
  )
);
