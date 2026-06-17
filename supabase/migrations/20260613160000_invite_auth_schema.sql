-- [Invite-Auth 1] DB schema: new user/driver fields, status & permission flags

create type public.account_status as enum ('pending', 'approved', 'rejected');
create type public.gender as enum ('male', 'female', 'other', 'prefer_not_to_say');

alter table public.users
  add column national_id text,
  add column status public.account_status not null default 'pending',
  add column can_approve_drivers boolean not null default false;

-- Unique constraint for national_id, nullable for legacy accounts
create unique index if not exists unique_national_id on public.users (national_id) where national_id is not null;

alter table public.drivers
  add column location text,
  add column birth_year int,
  add column gender public.gender,
  add column license_type text,
  add column license_issue_year int,
  add column license_photo_path text,
  add column consent_criminal_record boolean not null default false,
  add column owns_vehicle_ambulatory boolean not null default false;

-- Backfill: set existing users to 'approved' so current accounts keep working
update public.users set status = 'approved';
