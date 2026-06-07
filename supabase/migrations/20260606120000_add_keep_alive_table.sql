-- Keep-alive table for the "Keep Supabase Alive" GitHub Action.
--
-- Supabase pauses free-tier projects after ~7 days of *database* inactivity.
-- A request to /auth/v1/health does NOT count, because it never touches
-- Postgres. The scheduled workflow performs an anonymous REST read against
-- this table, which executes a real SELECT and resets the inactivity timer.
--
-- This table is intentionally public-readable (anon) so the ping returns a
-- clean 200 without authentication. It holds no sensitive data.

create table if not exists public.keep_alive (
	id smallint primary key default 1,
	last_pinged_at timestamptz not null default timezone('utc', now()),
	-- enforce a single row
	constraint keep_alive_singleton check (id = 1)
);

alter table public.keep_alive enable row level security;

-- Allow anonymous (and authenticated) clients to read the single row.
create policy "Anyone can read keep_alive"
on public.keep_alive
for select
to anon, authenticated
using (true);

grant select on public.keep_alive to anon, authenticated;

-- Seed the single row the workflow reads.
insert into public.keep_alive (id)
values (1)
on conflict (id) do nothing;
