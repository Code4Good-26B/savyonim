-- Driver cancellation reopens the original request for another driver, and
-- drivers can complete assigned rides without a separate in-progress step.
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
	elsif old.status = 'rejected' and new.status = 'approved' then
		return new;
	end if;

	raise exception 'Invalid request status transition: % -> %', old.status, new.status;
end;
$$;
