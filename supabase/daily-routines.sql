begin;

alter table public.shiplist_tasks
  add column if not exists completed_at timestamptz,
  add column if not exists daily_since date,
  add column if not exists daily_completions jsonb not null default '{}'::jsonb;

create or replace function public.set_shiplist_daily_completion(
  task_id text, task_day date, completion_time timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.shiplist_tasks
  set daily_completions = case
    when completion_time is null then daily_completions - task_day::text
    else pg_catalog.jsonb_set(
      daily_completions, array[task_day::text], pg_catalog.to_jsonb(completion_time), true
    )
  end
  where owner_id = (select auth.uid())
    and id = task_id
    and daily_since <= task_day;

  if not found then
    raise exception 'Routine not found';
  end if;
end;
$$;

revoke all on function public.set_shiplist_daily_completion(text, date, timestamptz)
  from public, anon;
grant execute on function public.set_shiplist_daily_completion(text, date, timestamptz)
  to authenticated;

commit;
