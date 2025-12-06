-- Migration to fix RLS policies for the plots table
-- Created: 2025-12-05

-- Step 1: Create a view for public plot data to avoid exposing sensitive information
CREATE OR REPLACE VIEW public_plots AS
SELECT
    id,
    project_name,
    type,
    block,
    plot_number,
    status,
    dimension,
    area,
    facing,
    price
FROM
    plots;

-- Step 2: Drop the overly permissive public access policy on the plots table
DROP POLICY IF EXISTS "Public can view plots" ON plots;

-- Step 3: Add a new policy to allow public access to the public_plots view
CREATE POLICY "Public can view plots" ON public_plots
    FOR SELECT USING (true);

-- Step 4: Add a policy to give admins full access to the plots table
CREATE POLICY "Admin full access to plots" ON plots
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Step 5: Ensure RLS is enabled on the new view
ALTER VIEW public_plots OWNER TO postgres;
ALTER TABLE public_plots ENABLE ROW LEVEL SECURITY;
