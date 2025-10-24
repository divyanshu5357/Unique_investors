-- Create the profiles table with all necessary columns
-- This ensures the table exists with the correct structure

-- First, create the table if it doesn't exist
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text not null default 'investor',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add missing columns if they don't exist
do $$
begin
  -- Add full_name column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'full_name') then
    alter table public.profiles add column full_name text;
  end if;

  -- Add role column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role') then
    alter table public.profiles add column role text not null default 'investor';
  end if;

  -- Add avatar_url column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;

  -- Add created_at column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'created_at') then
    alter table public.profiles add column created_at timestamptz default now();
  end if;

  -- Add updated_at column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'updated_at') then
    alter table public.profiles add column updated_at timestamptz default now();
  end if;
end $$;

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies for RLS
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Use ON CONFLICT DO NOTHING so automatic auth trigger won't fail when
  -- a profile with the same id already exists (we sometimes create profiles
  -- manually from server code). This prevents createUser from failing due
  -- to a duplicate-key or RLS-related insert failure.
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'investor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();