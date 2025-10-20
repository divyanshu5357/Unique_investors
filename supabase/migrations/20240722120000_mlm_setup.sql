
-- Step 1: Add columns for MLM structure to the profiles table
alter table "auth"."users" add column if not exists "uplineId" uuid null references "auth"."users"(id);
alter table public.profiles add column if not exists "uplineId" uuid null references "auth"."users"(id);
alter table public.profiles add column if not exists "totalCommission" numeric not null default 0.00;

-- Step 2: Create a function to increment totalCommission
create or replace function public.increment_commission (user_id uuid, amount numeric)
returns void as $$
  update public.profiles
  set "totalCommission" = "totalCommission" + amount
  where id = user_id;
$$ language sql volatile;

-- Step 3: Set up Foreign Key from profiles.uplineId to auth.users.id
-- This ensures that an upline must be a valid user.
alter table public.profiles
  add constraint profiles_uplineId_fkey
  foreign key ("uplineId")
  references "auth"."users" (id) on delete set null;

-- Step 4: Add a trigger to copy uplineId from auth.users to public.profiles on user creation
-- This keeps the public profile in sync with the auth user metadata, which is useful.
create or replace function public.handle_new_user_upline()
returns trigger as $$
begin
  update public.profiles
  set "uplineId" = (select raw_user_meta_data->>'uplineId' from auth.users where id = new.id)::uuid
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- drop trigger if exists on_auth_user_created_upline on auth.users;
-- create trigger on_auth_user_created_upline
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user_upline();

-- We don't need the trigger because we insert into profiles manually in our server action.

