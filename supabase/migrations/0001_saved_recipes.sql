-- Saved recipes per authenticated user.
-- Run this once in Supabase SQL Editor (or `supabase db push` if you set up the CLI).

create table if not exists public.saved_recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  dish        text not null,
  vegetarian  boolean not null default false,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists saved_recipes_user_id_created_at_idx
  on public.saved_recipes (user_id, created_at desc);

alter table public.saved_recipes enable row level security;

-- Users can only read their own saved recipes.
create policy "saved_recipes_select_own"
  on public.saved_recipes for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can only insert rows owned by themselves.
create policy "saved_recipes_insert_own"
  on public.saved_recipes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only delete their own rows.
create policy "saved_recipes_delete_own"
  on public.saved_recipes for delete
  to authenticated
  using (auth.uid() = user_id);
