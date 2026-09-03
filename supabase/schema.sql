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

-- Notes: freeform personal pages (rich text + pasted images), independent of boards/tasks.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content text not null default '',
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);

alter table public.notes enable row level security;

drop policy if exists "Users can view their own notes" on public.notes;
create policy "Users can view their own notes"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Storage bucket for images pasted into notes. Public read (URLs are unguessable UUIDs,
-- fine for a personal app); writes are restricted to a folder named after the uploader's
-- own user id, e.g. note-images/<user_id>/<file>.
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view note images" on storage.objects;
create policy "Anyone can view note images"
  on storage.objects for select
  using (bucket_id = 'note-images');

drop policy if exists "Users can upload their own note images" on storage.objects;
create policy "Users can upload their own note images"
  on storage.objects for insert
  with check (
    bucket_id = 'note-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own note images" on storage.objects;
create policy "Users can update their own note images"
  on storage.objects for update
  using (
    bucket_id = 'note-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own note images" on storage.objects;
create policy "Users can delete their own note images"
  on storage.objects for delete
  using (
    bucket_id = 'note-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Emails: same shape as notes (rich text + pasted images), kept as a fully separate
-- feature/table for writing down email-format templates and drafts.
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content text not null default '',
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emails_user_id_idx on public.emails (user_id);

alter table public.emails enable row level security;

drop policy if exists "Users can view their own emails" on public.emails;
create policy "Users can view their own emails"
  on public.emails for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own emails" on public.emails;
create policy "Users can insert their own emails"
  on public.emails for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own emails" on public.emails;
create policy "Users can update their own emails"
  on public.emails for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own emails" on public.emails;
create policy "Users can delete their own emails"
  on public.emails for delete
  using (auth.uid() = user_id);

drop trigger if exists emails_set_updated_at on public.emails;
create trigger emails_set_updated_at
  before update on public.emails
  for each row execute function public.set_updated_at();

-- Storage bucket for images pasted into emails, mirroring note-images but kept separate.
insert into storage.buckets (id, name, public)
values ('email-images', 'email-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view email images" on storage.objects;
create policy "Anyone can view email images"
  on storage.objects for select
  using (bucket_id = 'email-images');

drop policy if exists "Users can upload their own email images" on storage.objects;
create policy "Users can upload their own email images"
  on storage.objects for insert
  with check (
    bucket_id = 'email-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own email images" on storage.objects;
create policy "Users can update their own email images"
  on storage.objects for update
  using (
    bucket_id = 'email-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own email images" on storage.objects;
create policy "Users can delete their own email images"
  on storage.objects for delete
  using (
    bucket_id = 'email-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
