-- Rate-limit buckets for cost-amplification protection (e.g. /api/convert).
-- The table is fully locked (no policies, no role grants) — only the
-- consume_rate_limit() SECURITY DEFINER function can touch it, and only
-- service_role can call that function.

create table if not exists public.rate_limit_buckets (
  key           text primary key,
  count         integer not null default 0,
  window_start  timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
-- Intentionally no policies: anon/authenticated have zero direct access.

create or replace function public.consume_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now    timestamptz := now();
  v_window interval    := make_interval(secs => p_window_seconds);
  v_bucket public.rate_limit_buckets%rowtype;
begin
  insert into public.rate_limit_buckets (key)
  values (p_key)
  on conflict (key) do nothing;

  select * into v_bucket
  from public.rate_limit_buckets
  where key = p_key
  for update;

  if v_now - v_bucket.window_start > v_window then
    update public.rate_limit_buckets
    set count = 1, window_start = v_now
    where key = p_key;
    return query select true, p_max - 1, v_now + v_window;
    return;
  end if;

  if v_bucket.count >= p_max then
    return query select false, 0, v_bucket.window_start + v_window;
    return;
  end if;

  update public.rate_limit_buckets
  set count = count + 1
  where key = p_key;

  return query select true, p_max - (v_bucket.count + 1), v_bucket.window_start + v_window;
end;
$$;

-- Lock function execution to service_role only.
revoke execute on function public.consume_rate_limit(text, integer, integer) from public;
grant  execute on function public.consume_rate_limit(text, integer, integer) to service_role;
