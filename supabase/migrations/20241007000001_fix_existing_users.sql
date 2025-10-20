-- Create profiles for existing authenticated users who don't have profiles
-- Run this in your Supabase SQL Editor

INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'role', 
        'investor'
    ) as role,
    au.created_at,
    now() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL  -- Only insert for users without profiles
AND au.email IS NOT NULL;  -- Only for users with valid emails

-- Update any admin user
-- Replace 'anupad@admin.com' with your actual admin email
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'anupad@admin.com'
);