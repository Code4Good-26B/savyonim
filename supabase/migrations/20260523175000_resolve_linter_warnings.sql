-- Migration: Resolve pg_graphql exposure and multiple permissive policies linter warnings

-- 1. Disable the pg_graphql extension and schemas entirely since our app is strictly REST-based
drop extension if exists pg_graphql cascade;

-- 2. Refactor public.users RLS policies
drop policy if exists "Admins and dispatchers can do anything on users" on public.users;
drop policy if exists "Users can read their own user record" on public.users;

create policy "select_users" on public.users for select using (
  id = (select auth.uid()) or public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "insert_users" on public.users for insert with check (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "update_users" on public.users for update using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "delete_users" on public.users for delete using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

-- 3. Refactor public.drivers RLS policies
drop policy if exists "Admins and dispatchers can do anything on drivers" on public.drivers;
drop policy if exists "Drivers can read their own driver profile" on public.drivers;

create policy "select_drivers" on public.drivers for select using (
  user_id = (select auth.uid()) or public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "insert_drivers" on public.drivers for insert with check (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "update_drivers" on public.drivers for update using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "delete_drivers" on public.drivers for delete using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

-- 4. Refactor public.service_zones RLS policies
drop policy if exists "Admins and dispatchers can do anything on service_zones" on public.service_zones;
drop policy if exists "All authenticated users can read service zones" on public.service_zones;

create policy "select_service_zones" on public.service_zones for select using (
  (select auth.uid()) is not null or public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "insert_service_zones" on public.service_zones for insert with check (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "update_service_zones" on public.service_zones for update using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "delete_service_zones" on public.service_zones for delete using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

-- 5. Refactor public.ride_requests RLS policies
drop policy if exists "Admins and dispatchers can do anything on ride_requests" on public.ride_requests;
drop policy if exists "Drivers can read ride requests linked to their assigned rides" on public.ride_requests;

create policy "select_ride_requests" on public.ride_requests for select using (
  public.get_auth_user_role() in ('admin', 'dispatcher') or exists (
    select 1 from public.rides r
    join public.drivers d on r.driver_id = d.id
    where r.ride_request_id = public.ride_requests.id
      and d.user_id = (select auth.uid())
  )
);
create policy "insert_ride_requests" on public.ride_requests for insert with check (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "update_ride_requests" on public.ride_requests for update using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "delete_ride_requests" on public.ride_requests for delete using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);

-- 6. Refactor public.rides RLS policies
drop policy if exists "Admins and dispatchers can do anything on rides" on public.rides;
drop policy if exists "Drivers can read their own assigned rides" on public.rides;

create policy "select_rides" on public.rides for select using (
  public.get_auth_user_role() in ('admin', 'dispatcher') or exists (
    select 1 from public.drivers d
    where d.id = public.rides.driver_id
      and d.user_id = (select auth.uid())
  )
);
create policy "insert_rides" on public.rides for insert with check (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "update_rides" on public.rides for update using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
create policy "delete_rides" on public.rides for delete using (
  public.get_auth_user_role() in ('admin', 'dispatcher')
);
