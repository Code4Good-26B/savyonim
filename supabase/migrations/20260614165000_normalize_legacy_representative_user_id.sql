-- Normalize databases created from the early schema spelling so current ride
-- queries can use representative_user_id consistently.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rides'
      and column_name = 'representitive_user_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rides'
      and column_name = 'representative_user_id'
  ) then
    alter table public.rides
      rename column representitive_user_id to representative_user_id;
  end if;
end
$$;
