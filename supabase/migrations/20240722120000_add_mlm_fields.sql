
-- Add new columns to the profiles table for MLM structure
alter table profiles
  add column "uplineId" uuid references profiles(id) on delete set null,
  add column "downlineCount" integer not null default 0,
  add column "totalCommission" numeric(10, 2) not null default 0.00;

-- Create indexes for performance
create index on profiles ("uplineId");

-- Create a function to safely increment the downline count
create or replace function increment_downline(user_id uuid)
returns void as $$
  update profiles
  set "downlineCount" = "downlineCount" + 1
  where id = user_id;
$$ language sql volatile;


-- Create a function to safely decrement the downline count
create or replace function decrement_downline(user_id uuid)
returns void as $$
  update profiles
  set "downlineCount" = "downlineCount" - 1
  where id = user_id and "downlineCount" > 0;
$$ language sql volatile;

-- Create a function to safely add to the total commission
create or replace function increment_commission(user_id uuid, amount numeric)
returns void as $$
  update profiles
  set "totalCommission" = "totalCommission" + amount
  where id = user_id;
$$ language sql volatile;
