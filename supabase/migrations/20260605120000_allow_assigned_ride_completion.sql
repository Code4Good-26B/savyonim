-- Allow drivers to complete an assigned ride directly from the Phase 3 driver UI.

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
	elsif old.status = 'approved' and new.status in ('waiting_for_representative', 'rejected') then
		return new;
	elsif old.status = 'waiting_for_representative' and new.status in ('in_progress', 'completed', 'rejected') then
		return new;
	elsif old.status = 'in_progress' and new.status in ('completed', 'rejected') then
		return new;
	end if;

	raise exception 'Invalid request status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.sync_request_status_from_ride()
returns trigger
language plpgsql
as $$
begin
	if new.status = 'assigned' then
		update public.ride_requests
		set status = 'waiting_for_representative', assigned_at = coalesce(assigned_at, timezone('utc', now()))
		where id = new.ride_request_id and status in ('approved', 'waiting_for_representative');
	elsif new.status = 'in_progress' then
		update public.ride_requests
		set status = 'in_progress', started_at = coalesce(started_at, timezone('utc', now()))
		where id = new.ride_request_id and status in ('waiting_for_representative', 'in_progress');
	elsif new.status = 'completed' then
		update public.ride_requests
		set status = 'completed', completed_at = coalesce(completed_at, timezone('utc', now()))
		where id = new.ride_request_id and status in ('waiting_for_representative', 'in_progress', 'completed');
	elsif new.status = 'rejected' then
		update public.ride_requests
		set
			status = 'rejected',
			rejected_at = coalesce(rejected_at, timezone('utc', now())),
			rejection_reason = coalesce(new.rejection_reason, rejection_reason)
		where id = new.ride_request_id and status in ('pending', 'approved', 'waiting_for_representative', 'in_progress', 'rejected');
	end if;

	return new;
end;
$$;

alter function public.enforce_request_status_transition() set search_path = public;
alter function public.sync_request_status_from_ride() set search_path = public;
