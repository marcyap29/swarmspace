-- SwarmSpace Database Schema
-- Run this in your Supabase SQL editor

-- Developers table (extends Supabase auth.users)
create table public.developers (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  website text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free', -- 'free' | 'verified'
  plan_status text default 'active', -- 'active' | 'canceled' | 'past_due'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Plugins table
create table public.plugins (
  id uuid default gen_random_uuid() primary key,
  developer_id uuid references public.developers(id) on delete cascade not null,
  name text not null,
  description text,
  capability text, -- natural language capability description
  website_url text,
  manifest_url text,
  trust_tier text default 'experimental', -- 'experimental' | 'community' | 'verified'
  review_status text default 'pending', -- 'pending' | 'in_review' | 'approved' | 'rejected'
  review_notes text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table public.developers enable row level security;
alter table public.plugins enable row level security;

-- Developers can only read/update their own record
create policy "developers_select_own" on public.developers
  for select using (auth.uid() = id);

create policy "developers_update_own" on public.developers
  for update using (auth.uid() = id);

-- Plugins: developers can CRUD their own
create policy "plugins_select_own" on public.plugins
  for select using (auth.uid() = developer_id);

create policy "plugins_insert_own" on public.plugins
  for insert with check (auth.uid() = developer_id);

create policy "plugins_update_own" on public.plugins
  for update using (auth.uid() = developer_id);

create policy "plugins_delete_own" on public.plugins
  for delete using (auth.uid() = developer_id);

-- Auto-create developer record on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.developers (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger developers_updated_at before update on public.developers
  for each row execute procedure public.handle_updated_at();

create trigger plugins_updated_at before update on public.plugins
  for each row execute procedure public.handle_updated_at();
