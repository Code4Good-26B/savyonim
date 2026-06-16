-- Migration: Remove dispatcher role and merge into admin

-- 1. Migrate existing users and invitations from dispatcher to admin
update public.users set role = 'admin' where role = 'dispatcher';
update public.invitations set invited_role = 'admin' where invited_role = 'dispatcher';

-- 2. Drop policies that depend on enum-typed role columns before altering them
drop policy if exists "Representatives can insert driver users" on public.users;
drop policy if exists "Representatives can update driver users" on public.users;
drop policy if exists "Representatives can insert driver invitations" on public.invitations;
drop policy if exists "Representatives can read their driver invitations" on public.invitations;

-- 3. Alter user_role enum
alter type public.user_role rename to user_role_old;
create type public.user_role as enum ('admin', 'driver', 'representative');
alter table public.users alter column role type public.user_role using role::text::public.user_role;
alter table public.invitations alter column invited_role type public.user_role using invited_role::text::public.user_role;

drop function if exists public.get_auth_user_role() cascade;
drop type public.user_role_old;

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

grant execute on function public.get_auth_user_role() to authenticated, anon;

-- 4. Update RLS policies by dropping the old ones and creating new ones without 'dispatcher'

-- Drop policies with dispatcher reference
drop policy if exists "Admins and dispatchers can do anything on ride_requests" on public.ride_requests;
drop policy if exists "Admins and dispatchers can do anything on rides" on public.rides;
drop policy if exists "Admins and dispatchers can do anything on ambulances" on public.ambulances;
drop policy if exists "Admins and dispatchers can do anything on passengers" on public.passengers;
drop policy if exists "Admins and dispatchers can do anything on service_zones" on public.service_zones;
drop policy if exists "Dispatchers can read users" on public.users;
drop policy if exists "Dispatchers can read drivers" on public.drivers;

-- Recreate policies for admin only
create policy "Admins can do anything on ride_requests"
on public.ride_requests for all
using (
  public.get_auth_user_role() = 'admin' and
  public.get_auth_user_status() = 'approved'
);

create policy "Admins can do anything on rides"
on public.rides for all
using (
  public.get_auth_user_role() = 'admin' and
  public.get_auth_user_status() = 'approved'
);

create policy "Admins can do anything on ambulances"
on public.ambulances for all
using (
  public.get_auth_user_role() = 'admin' and
  public.get_auth_user_status() = 'approved'
);

create policy "Admins can do anything on passengers"
on public.passengers for all
using (
  public.get_auth_user_role() = 'admin' and
  public.get_auth_user_status() = 'approved'
);

create policy "Admins can do anything on service_zones"
on public.service_zones for all
using (
  public.get_auth_user_role() = 'admin' and
  public.get_auth_user_status() = 'approved'
);

create policy "Admins can do anything on users"
on public.users for all
using (public.get_auth_user_role() = 'admin');

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

create policy "Admins can do anything on drivers"
on public.drivers for all
using (public.get_auth_user_role() = 'admin');

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

create policy "Admins can read all license photos"
on storage.objects for select
using (
  bucket_id = 'license-photos'
  and public.get_auth_user_role() = 'admin'
);

create policy "Authorized representatives can read license photos"
on storage.objects for select
using (
  bucket_id = 'license-photos'
  and public.get_auth_user_role() = 'representative'
  and public.can_current_user_approve_drivers() = true
);
