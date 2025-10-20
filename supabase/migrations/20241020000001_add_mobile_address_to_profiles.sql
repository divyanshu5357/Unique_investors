-- Add mobile and address fields to profiles table
-- These fields can be updated only once by brokers

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Add comment to track the purpose
COMMENT ON COLUMN public.profiles.mobile_number IS 'Broker mobile number - can be updated only once';
COMMENT ON COLUMN public.profiles.address IS 'Broker address - can be updated only once';
COMMENT ON COLUMN public.profiles.profile_completed IS 'Flag to track if profile details have been completed';
