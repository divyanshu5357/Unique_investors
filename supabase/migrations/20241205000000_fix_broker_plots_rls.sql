-- Fix RLS policies for broker plots access
-- The previous policy was too broad and causing 400 errors

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Broker can view own plots" ON plots;

-- Create a more specific policy that allows brokers to view ONLY their own plots
CREATE POLICY "Brokers view own plots" ON plots
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND broker_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'broker')
    );

-- Allow public read access to plots (for explore page)
CREATE POLICY "Public can view plots" ON plots
    FOR SELECT USING (true);

-- Drop old public policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Brokers can read their own plots" ON plots;
DROP POLICY IF EXISTS "Anyone can view plots" ON plots;

-- Ensure brokers can update their own plots
CREATE POLICY "Brokers update own plots" ON plots
    FOR UPDATE USING (
        auth.uid() = broker_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'broker')
    )
    WITH CHECK (
        auth.uid() = broker_id
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'broker')
    );
