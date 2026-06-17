-- 1. Add vehicle columns and ambulance type
alter table public.drivers 
  add column vehicle_make text,
  add column vehicle_model text,
  add column vehicle_plate text,
  add column vehicle_color text,
  add column vehicle_seats int;

alter table public.ambulances
  add column ambulance_type text;

-- 2. Add invitations table
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create table public.invitations (
    id uuid default gen_random_uuid() primary key,
    email text not null,
    invited_role public.user_role not null,
    invited_by uuid references public.users(id) not null,
    status public.invitation_status default 'pending' not null,
    auth_user_id uuid references auth.users(id),
    created_at timestamptz default now() not null,
    accepted_at timestamptz,
    updated_at timestamptz default now() not null
);

-- Unique email constraint for pending invitations
create unique index unique_pending_email on public.invitations (lower(email)) where status = 'pending';

-- Trigger for updated_at
create trigger set_invitations_updated_at
  before update on public.invitations
  for each row
  execute function public.set_updated_at();

-- RLS for invitations
alter table public.invitations enable row level security;

create policy "Admins have full access to invitations" on public.invitations
  for all using (public.get_auth_user_role() = 'admin');

create policy "Representatives can insert their own invitations" on public.invitations
  for insert with check (
    public.get_auth_user_role() = 'representative'
  );

create policy "Representatives can read their own invitations" on public.invitations
  for select using (
    public.get_auth_user_role() = 'representative' and invited_by in (
      select id from public.users where id = auth.uid()
    )
  );
