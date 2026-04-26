-- Foundational dispatch schema for Savyonim.
-- Local migration file only. Do not apply to production without team lead approval.

begin;

create extension if not exists pgcrypto;

-- Enums
do $$
begin
	if not exists (select 1 from pg_type where typname = 'user_role') then
		create type public.user_role as enum ('admin', 'dispatcher', 'driver', 'representitive');
	end if;

	if not exists (select 1 from pg_type where typname = 'request_status') then
		create type public.request_status as enum (
			'pending',
			'approved',
			'waiting_for_representitive',
			'in_progress',
			'completed',
			'rejected'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'ride_status') then
		create type public.ride_status as enum ('assigned', 'in_progress', 'completed', 'rejected');
	end if;

	if not exists (select 1 from pg_type where typname = 'mobility_requirement') then
		create type public.mobility_requirement as enum (
			'none',
			'wheelchair',
			'walker',
			'cane'
		);
	end if;
end
$$;

-- Shared timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

-- Enforce request status state-machine transitions.
create or replace function public.enforce_request_status_transition()
returns trigger
language plpgsql
as $$
begin
	if tg_op = 'INSERT' then
		return new;
	end if;

	if old.status = new.status then
		return new;
	end if;

	if old.status = 'pending' and new.status in ('approved', 'rejected') then
		return new;
	elsif old.status = 'approved' and new.status in ('waiting_for_representitive', 'rejected') then
		return new;
	elsif old.status = 'waiting_for_representitive' and new.status in ('in_progress', 'rejected') then
		return new;
	elsif old.status = 'in_progress' and new.status in ('completed', 'rejected') then
		return new;
	end if;

	raise exception 'Invalid request status transition: % -> %', old.status, new.status;
end;
$$;

-- Service zones
create table if not exists public.service_zones (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	region_code text unique,
	region text,
	city text,
	get_all boolean not null default false,
	address_list jsonb not null default '[]'::jsonb,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_service_zones_updated_at
before update on public.service_zones
for each row
execute function public.set_updated_at();

-- App users mirror auth.users to support role-based behavior and RLS joins.
create table if not exists public.users (
	id uuid primary key references auth.users(id) on delete cascade,
	full_name text not null,
	phone text,
	role public.user_role not null,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_users_role on public.users (role);

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- Drivers are user profiles with operational assignment data.
create table if not exists public.drivers (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null unique references public.users(id) on delete cascade,
	contact_phone text,
	service_zone_id uuid references public.service_zones(id) on delete set null,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_drivers_service_zone_id on public.drivers (service_zone_id);
create index if not exists idx_drivers_is_active on public.drivers (is_active);

create trigger set_drivers_updated_at
before update on public.drivers
for each row
execute function public.set_updated_at();

-- Ambulances available for assignments.
create table if not exists public.ambulances (
	id uuid primary key default gen_random_uuid(),
	license_plate text not null unique,
	service_zone_id uuid references public.service_zones(id) on delete set null,
	is_available boolean not null default true,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ambulances_service_zone_id on public.ambulances (service_zone_id);
create index if not exists idx_ambulances_availability on public.ambulances (is_available, is_active);

create trigger set_ambulances_updated_at
before update on public.ambulances
for each row
execute function public.set_updated_at();

-- Passenger master data.
create table if not exists public.passengers (
	id uuid primary key default gen_random_uuid(),
	national_id text unique,
	full_name text not null,
	category text,
	mobility_need public.mobility_requirement not null default 'none',
	mobility_notes text,
	phone text,
	emergency_contact text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_passengers_category on public.passengers (category);

create trigger set_passengers_updated_at
before update on public.passengers
for each row
execute function public.set_updated_at();

-- Incoming ride requests from dispatch or external intake.
create table if not exists public.ride_requests (
	id uuid primary key default gen_random_uuid(),
	passenger_id uuid not null references public.passengers(id) on delete restrict,
	requested_by_user_id uuid references public.users(id) on delete set null,
	status public.request_status not null default 'pending',
	source_address text not null,
	source_notes text,
	destination_address text not null,
	destination_notes text,
	return_trip_required boolean not null default false,
	requested_pickup_at timestamptz,
	approved_at timestamptz,
	assigned_at timestamptz,
	started_at timestamptz,
	completed_at timestamptz,
	rejected_at timestamptz,
	rejection_reason text,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	check (
		(status = 'completed' and completed_at is not null)
		or (status <> 'completed')
	),
	check (
		(status = 'rejected' and rejected_at is not null)
		or (status <> 'rejected')
	)
);

create index if not exists idx_ride_requests_status on public.ride_requests (status);
create index if not exists idx_ride_requests_passenger_id on public.ride_requests (passenger_id);
create index if not exists idx_ride_requests_requested_pickup_at on public.ride_requests (requested_pickup_at);

create trigger set_ride_requests_updated_at
before update on public.ride_requests
for each row
execute function public.set_updated_at();

create trigger enforce_ride_request_status_transition
before update on public.ride_requests
for each row
execute function public.enforce_request_status_transition();

-- Assigned operational rides, one active assignment per request/driver/ambulance.
create table if not exists public.rides (
	id uuid primary key default gen_random_uuid(),
	ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
	driver_id uuid not null references public.drivers(id) on delete restrict,
	ambulance_id uuid not null references public.ambulances(id) on delete restrict,
	assigned_by_user_id uuid references public.users(id) on delete set null,
	representitive_user_id uuid references public.users(id) on delete set null,
	status public.ride_status not null default 'assigned',
	assigned_at timestamptz not null default timezone('utc', now()),
	in_progress_at timestamptz,
	completed_at timestamptz,
	rejected_at timestamptz,
	rejection_reason text,
	odometer_start_km numeric(10,1),
	odometer_end_km numeric(10,1),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	check (
		odometer_start_km is null
		or odometer_end_km is null
		or odometer_end_km >= odometer_start_km
	),
	check (
		(status = 'completed' and completed_at is not null)
		or (status <> 'completed')
	),
	check (
		(status = 'rejected' and rejected_at is not null and rejection_reason is not null)
		or (status <> 'rejected')
	)
);

create index if not exists idx_rides_ride_request_id on public.rides (ride_request_id);
create index if not exists idx_rides_driver_id on public.rides (driver_id);
create index if not exists idx_rides_ambulance_id on public.rides (ambulance_id);
create index if not exists idx_rides_representitive_user_id on public.rides (representitive_user_id);
create index if not exists idx_rides_status on public.rides (status);

-- Prevent race conditions for assignment by allowing only one active row.
create unique index if not exists ux_rides_active_request
on public.rides (ride_request_id)
where status in ('assigned', 'in_progress');

create unique index if not exists ux_rides_active_driver
on public.rides (driver_id)
where status in ('assigned', 'in_progress');

create unique index if not exists ux_rides_active_ambulance
on public.rides (ambulance_id)
where status in ('assigned', 'in_progress');

create trigger set_rides_updated_at
before update on public.rides
for each row
execute function public.set_updated_at();

-- Keep ride request lifecycle synchronized from ride operations.
create or replace function public.sync_request_status_from_ride()
returns trigger
language plpgsql
as $$
begin
	if new.status = 'assigned' then
		update public.ride_requests
		set status = 'waiting_for_representitive', assigned_at = coalesce(assigned_at, timezone('utc', now()))
		where id = new.ride_request_id and status in ('approved', 'waiting_for_representitive');
	elsif new.status = 'in_progress' then
		update public.ride_requests
		set status = 'in_progress', started_at = coalesce(started_at, timezone('utc', now()))
		where id = new.ride_request_id and status in ('waiting_for_representitive', 'in_progress');
	elsif new.status = 'completed' then
		update public.ride_requests
		set status = 'completed', completed_at = coalesce(completed_at, timezone('utc', now()))
		where id = new.ride_request_id and status in ('in_progress', 'completed');
	elsif new.status = 'rejected' then
		update public.ride_requests
		set
			status = 'rejected',
			rejected_at = coalesce(rejected_at, timezone('utc', now())),
			rejection_reason = coalesce(new.rejection_reason, rejection_reason)
		where id = new.ride_request_id and status in ('pending', 'approved', 'waiting_for_representitive', 'in_progress', 'rejected');
	end if;

	return new;
end;
$$;

create trigger sync_request_status_on_ride_write
after insert or update of status, rejection_reason on public.rides
for each row
execute function public.sync_request_status_from_ride();

-- RLS: enabled now, policies can be layered based on role columns and JWT claims.
alter table public.users enable row level security;
alter table public.drivers enable row level security;
alter table public.ambulances enable row level security;
alter table public.service_zones enable row level security;
alter table public.passengers enable row level security;
alter table public.ride_requests enable row level security;
alter table public.rides enable row level security;

commit;
