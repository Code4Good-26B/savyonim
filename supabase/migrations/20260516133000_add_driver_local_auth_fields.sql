-- Local driver auth fields used by the Next.js API when talking directly to
-- the Docker Postgres database.

alter table public.users
add column if not exists email text,
add column if not exists password_hash text;

create unique index if not exists ux_users_email_lower
on public.users (lower(email))
where email is not null;
