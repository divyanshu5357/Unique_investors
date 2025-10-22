-- Add has_changed_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_changed_name BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_has_changed_name ON profiles(has_changed_name);