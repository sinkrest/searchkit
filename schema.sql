-- SearchKit SaaS Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  title text,
  experience_years int,
  experience text,
  skills text,
  target_roles text,
  salary_min int,
  salary_target int,
  salary_currency text default 'EUR',
  location_country text,
  timezone text,
  work_style text default 'remote' check (work_style in ('remote', 'hybrid', 'onsite', 'any')),
  visa_status text,
  company_stage text,
  master_cv text,
  positioning text,
  stripe_customer_id text,
  plan text default 'trial' check (plan in ('trial', 'starter', 'pro', 'premium', 'free')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  screening_sources text[] default '{}',
  brief_email boolean default true,
  linkedin_cadence text default 'tue_thu_sat',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Jobs (scored)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  title text not null,
  company text not null,
  url text,
  description text,
  location text,
  salary_range text,
  source text default 'manual',
  score int,
  tier int,
  score_breakdown jsonb,
  pipeline_stage text default 'saved' check (pipeline_stage in ('saved','applied','interviewing','offer','closed')),
  close_reason text,
  notes text,
  tailored_cv text,
  tailored_changes jsonb,
  cover_letter text,
  applied_at timestamptz,
  date_added timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  category text not null,
  label text not null,
  detail text,
  created_at timestamptz default now()
);

-- Morning briefs
create table briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  content text not null,
  new_jobs_count int default 0,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- LinkedIn drafts
create table linkedin_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  content text not null,
  post_type text,
  status text default 'draft' check (status in ('draft', 'posted', 'skipped')),
  created_at timestamptz default now()
);

-- Chat messages (server-persisted)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  actions jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index idx_jobs_user on jobs(user_id);
create index idx_jobs_stage on jobs(user_id, pipeline_stage);
create index idx_activities_user on activities(user_id);
create index idx_briefs_user on briefs(user_id);
create index idx_linkedin_drafts_user on linkedin_drafts(user_id);
create index idx_chat_messages_user on chat_messages(user_id);

-- Row Level Security
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table activities enable row level security;
alter table briefs enable row level security;
alter table linkedin_drafts enable row level security;
alter table chat_messages enable row level security;

-- Users can only access their own data
create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

create policy "Users manage own jobs" on jobs
  for all using (auth.uid() = user_id);

create policy "Users manage own activities" on activities
  for all using (auth.uid() = user_id);

create policy "Users manage own briefs" on briefs
  for all using (auth.uid() = user_id);

create policy "Users manage own drafts" on linkedin_drafts
  for all using (auth.uid() = user_id);

create policy "Users manage own chat" on chat_messages
  for all using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at();

create trigger jobs_updated_at before update on jobs
  for each row execute procedure update_updated_at();
