-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists boards_user_id_idx on public.boards (user_id);

alter table public.boards enable row level security;

drop policy if exists "Users can view their own boards" on public.boards;
create policy "Users can view their own boards"
  on public.boards for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own boards" on public.boards;
create policy "Users can insert their own boards"
  on public.boards for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own boards" on public.boards;
create policy "Users can update their own boards"
  on public.boards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own boards" on public.boards;
create policy "Users can delete their own boards"
  on public.boards for delete
  using (auth.uid() = user_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  notes_type text not null default 'note' check (notes_type in ('note', 'steps')),
  steps jsonb not null default '[]'::jsonb,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'New' check (status in ('New', 'InProgress', 'Blocked', 'Done')),
  due_date date,
  requester_name text,
  board_id uuid references public.boards (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run: adds the new columns if this table already existed before they were introduced.
alter table public.tasks add column if not exists notes_type text not null default 'note' check (notes_type in ('note', 'steps'));
alter table public.tasks add column if not exists steps jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists board_id uuid references public.boards (id) on delete cascade;

-- Backfill: any pre-existing tasks (from before boards existed) get filed into a
-- new "General" board per user, so nothing becomes orphaned when board_id goes NOT NULL.
do $$
declare
  u record;
  new_board_id uuid;
begin
  for u in select distinct user_id from public.tasks where board_id is null loop
    insert into public.boards (name, user_id) values ('General', u.user_id) returning id into new_board_id;
    update public.tasks set board_id = new_board_id where user_id = u.user_id and board_id is null;
  end loop;
end $$;

alter table public.tasks alter column board_id set not null;

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_board_id_idx on public.tasks (board_id);

alter table public.tasks enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
