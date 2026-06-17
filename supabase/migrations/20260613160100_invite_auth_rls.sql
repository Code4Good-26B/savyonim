-- [Invite-Auth 2] RLS policies: status gating + invite/approve permission rules

-- Helper to securely retrieve the current user's status bypassing RLS
create or replace function public.get_auth_user_status()
returns public.account_status
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  r_status public.account_status;
begin
  select status into r_status
  from public.users
  where id = auth.uid();
  return coalesce(r_status, 'pending'::public.account_status);
end;
$$;

-- Helper to securely retrieve if the current user can approve drivers
create or replace function public.can_current_user_approve_drivers()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  can_approve boolean;
begin
  select can_approve_drivers into can_approve
  from public.users
  where id = auth.uid();
  return coalesce(can_approve, false);
end;
$$;

-- -------------------------------------------------------------
-- 1. Status gating on operational tables
-- -------------------------------------------------------------

-- Drop existing operational policies
drop policy if exists "Admins and dispatchers can do anything on ride_requests" on public.ride_requests;
drop policy if exists "Drivers can read ride requests linked to their assigned rides" on public.ride_requests;

drop policy if exists "Admins and dispatchers can do anything on rides" on public.rides;
drop policy if exists "Drivers can read their own assigned rides" on public.rides;

drop policy if exists "Admins and dispatchers can do anything on ambulances" on public.ambulances;

drop policy if exists "Admins and dispatchers can do anything on passengers" on public.passengers;

drop policy if exists "Admins and dispatchers can do anything on service_zones" on public.service_zones;
drop policy if exists "All authenticated users can read service zones" on public.service_zones;

-- Recreate with status gating

-- Ride Requests
create policy "Admins and dispatchers can do anything on ride_requests"
on public.ride_requests for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher') and
  public.get_auth_user_status() = 'approved'
);

create policy "Drivers can read ride requests linked to their assigned rides"
on public.ride_requests for select
using (
  public.get_auth_user_status() = 'approved' and
  exists (
    select 1
    from public.rides r
    join public.drivers d on r.driver_id = d.id
    where r.ride_request_id = public.ride_requests.id
      and d.user_id = auth.uid()
  )
);

-- Rides
create policy "Admins and dispatchers can do anything on rides"
on public.rides for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher') and
  public.get_auth_user_status() = 'approved'
);

create policy "Drivers can read their own assigned rides"
on public.rides for select
using (
  public.get_auth_user_status() = 'approved' and
  exists (
    select 1
    from public.drivers d
    where d.id = public.rides.driver_id
      and d.user_id = auth.uid()
  )
);

create policy "Drivers can update their own assigned rides"
on public.rides for update
using (
  public.get_auth_user_status() = 'approved' and
  exists (
    select 1
    from public.drivers d
    where d.id = public.rides.driver_id
      and d.user_id = auth.uid()
  )
);

-- Ambulances
create policy "Admins and dispatchers can do anything on ambulances"
on public.ambulances for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher') and
  public.get_auth_user_status() = 'approved'
);

-- Passengers
create policy "Admins and dispatchers can do anything on passengers"
on public.passengers for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher') and
  public.get_auth_user_status() = 'approved'
);

-- Service Zones
create policy "Admins and dispatchers can do anything on service_zones"
on public.service_zones for all
using (
  public.get_auth_user_role() in ('admin', 'dispatcher') and
  public.get_auth_user_status() = 'approved'
);

create policy "All approved users can read service zones"
on public.service_zones for select
using (
  public.get_auth_user_status() = 'approved'
);

-- -------------------------------------------------------------
-- 2. Permission matrix for users and drivers
-- -------------------------------------------------------------

-- Drop existing user and driver policies
drop policy if exists "Admins and dispatchers can do anything on users" on public.users;
drop policy if exists "Users can read their own user record" on public.users;

drop policy if exists "Admins and dispatchers can do anything on drivers" on public.drivers;
drop policy if exists "Drivers can read their own driver profile" on public.drivers;

-- Users (insert/update logic)
create policy "Admins can do anything on users"
on public.users for all
using (public.get_auth_user_role() = 'admin');

create policy "Dispatchers can read users"
on public.users for select
using (public.get_auth_user_role() = 'dispatcher');

create policy "Representatives can insert driver users"
on public.users for insert
with check (
  public.get_auth_user_role() = 'representative' and
  public.can_current_user_approve_drivers() = true and
  role = 'driver'
);

create policy "Representatives can update driver users"
on public.users for update
using (
  public.get_auth_user_role() = 'representative' and
  public.can_current_user_approve_drivers() = true and
  role = 'driver'
);

create policy "Users can read their own user record"
on public.users for select
using (id = auth.uid());

-- Drivers
create policy "Admins can do anything on drivers"
on public.drivers for all
using (public.get_auth_user_role() = 'admin');

create policy "Dispatchers can read drivers"
on public.drivers for select
using (public.get_auth_user_role() = 'dispatcher');

create policy "Representatives can insert drivers"
on public.drivers for insert
with check (
  public.get_auth_user_role() = 'representative' and
  public.can_current_user_approve_drivers() = true
);

create policy "Representatives can update drivers"
on public.drivers for update
using (
  public.get_auth_user_role() = 'representative' and
  public.can_current_user_approve_drivers() = true
);

create policy "Drivers can read their own driver profile"
on public.drivers for select
using (user_id = auth.uid());

-- -------------------------------------------------------------
-- 3. Invitations RLS
-- -------------------------------------------------------------

-- Drop existing invitations policies if they don't match the new matrix
drop policy if exists "Admins have full access to invitations" on public.invitations;
drop policy if exists "Representatives can insert their own invitations" on public.invitations;
drop policy if exists "Representatives can read their own invitations" on public.invitations;

create policy "Admins have full access to invitations"
on public.invitations for all
using (public.get_auth_user_role() = 'admin');

create policy "Representatives can insert driver invitations"
on public.invitations for insert
with check (
  public.get_auth_user_role() = 'representative' and
  public.can_current_user_approve_drivers() = true and
  invited_role = 'driver'
);

create policy "Representatives can read their driver invitations"
on public.invitations for select
using (
  public.get_auth_user_role() = 'representative' and
  public.can_current_user_approve_drivers() = true and
  invited_role = 'driver' and
  invited_by in (select id from public.users where id = auth.uid())
);
