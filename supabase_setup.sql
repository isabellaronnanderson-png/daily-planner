-- Run this in your Supabase project's SQL Editor (the same project you're
-- already using for other apps). This creates a NEW table just for
-- isabella's planner — it won't touch anything from your other apps.

create table if not exists planner_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table planner_app_data enable row level security;

create policy "Users can view their own planner data"
  on planner_app_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own planner data"
  on planner_app_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own planner data"
  on planner_app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own planner data"
  on planner_app_data for delete
  using (auth.uid() = user_id);
