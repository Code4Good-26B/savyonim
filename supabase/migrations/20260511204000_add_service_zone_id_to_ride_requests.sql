-- Issue #26: add missing service_zone_id to ride_requests.

alter table if exists public.ride_requests
  add column if not exists service_zone_id uuid references public.service_zones(id) on delete set null;

create index if not exists idx_ride_requests_service_zone_id on public.ride_requests (service_zone_id);
