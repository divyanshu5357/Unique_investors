-- Migration: Prevent orphaned profiles
-- This trigger ensures that a profile cannot be created without a corresponding auth user
-- Created: 2025-11-20

-- Function to validate auth user exists before profile insertion/update
CREATE OR REPLACE FUNCTION prevent_orphaned_profiles()
RETURNS TRIGGER AS $$
DECLARE
    auth_user_exists BOOLEAN;
BEGIN
    -- Check if user exists in auth.users table
    SELECT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = NEW.id
    ) INTO auth_user_exists;

    -- If auth user doesn't exist, prevent the operation
    IF NOT auth_user_exists THEN
        RAISE EXCEPTION 'Cannot create/update profile: Auth user with ID % does not exist. Create auth user first.', NEW.id
            USING HINT = 'Use Supabase Auth API to create user before creating profile',
                  ERRCODE = 'foreign_key_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires BEFORE INSERT or UPDATE on profiles table
DROP TRIGGER IF EXISTS validate_auth_user_before_profile ON public.profiles;
CREATE TRIGGER validate_auth_user_before_profile
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_orphaned_profiles();

-- Add helpful comment
COMMENT ON FUNCTION prevent_orphaned_profiles() IS 'Prevents orphaned profiles by ensuring auth user exists before profile creation/update';
COMMENT ON TRIGGER validate_auth_user_before_profile ON public.profiles IS 'Validates that auth user exists before allowing profile operations';
