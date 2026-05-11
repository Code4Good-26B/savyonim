-- Add service-zone ownership to ride requests so API zone filtering can query directly.

begin;

alter table public.ride_requests
add column if not exists service_zone_id uuid;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'ride_requests_service_zone_id_fkey'
			and conrelid = 'public.ride_requests'::regclass
	) then
		alter table public.ride_requests
		add constraint ride_requests_service_zone_id_fkey
		foreign key (service_zone_id)
		references public.service_zones(id)
		on delete set null;
	end if;
end
$$;

create index if not exists idx_ride_requests_service_zone_id
on public.ride_requests (service_zone_id);

commit;
