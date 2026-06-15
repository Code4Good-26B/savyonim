-- Migration: Remove dispatcher role and merge into admin

-- 1. Migrate existing users and invitations from dispatcher to admin
update public.users set role = 'admin' where role = 'dispatcher';
update public.invitations set invited_role = 'admin' where invited_role = 'dispatcher';

-- 2. Alter user_role enum
alter type public.user_role rename to user_role_old;
create type public.user_role as enum ('admin', 'driver', 'representative');
alter table public.users alter column role type public.user_role using role::text::public.user_role;
alter table public.invitations alter column invited_role type public.user_role using invited_role::text::public.user_role;
drop type public.user_role_old;

-- 3. Update RLS policies by dropping the old ones and creating new ones without 'dispatcher'

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
