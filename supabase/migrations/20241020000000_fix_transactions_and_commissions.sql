-- =====================================================
-- Fix transactions table and add commission tracking
-- =====================================================

-- STEP 1: Add missing columns to transactions table if they don't exist
DO $$ 
BEGIN
    -- Add wallet_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'wallet_id'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN wallet_id UUID REFERENCES wallets(owner_id) ON DELETE CASCADE;
    END IF;

    -- Add wallet_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'wallet_type'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN wallet_type TEXT CHECK (wallet_type IN ('direct', 'downline'));
    END IF;

    -- Add plot_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'plot_id'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN plot_id UUID REFERENCES plots(id) ON DELETE SET NULL;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'status'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed'));
    END IF;

    -- Add payment_mode column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'payment_mode'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN payment_mode TEXT;
    END IF;

    -- Add transaction_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN transaction_id TEXT;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- STEP 2: Update RPC functions to also create transaction records
-- Drop existing functions first
DROP FUNCTION IF EXISTS upsert_seller_commission(UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS upsert_upline_commission(UUID, TEXT, DECIMAL);

-- Recreate upsert_seller_commission with transaction logging
CREATE OR REPLACE FUNCTION upsert_seller_commission(
    seller_id UUID,
    seller_name TEXT,
    commission_amount DECIMAL,
    plot_number TEXT DEFAULT NULL,
    project_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    plot_ref UUID;
BEGIN
    -- Get plot_id if plot details provided
    IF plot_number IS NOT NULL AND project_name IS NOT NULL THEN
        SELECT id INTO plot_ref 
        FROM plots 
        WHERE plots.plot_number = upsert_seller_commission.plot_number 
          AND plots.project_name = upsert_seller_commission.project_name
        LIMIT 1;
    END IF;

    -- Insert or update wallet
    INSERT INTO wallets (owner_id, direct_sale_balance, downline_sale_balance, total_balance, created_at, updated_at)
    VALUES (seller_id, commission_amount, 0, commission_amount, NOW(), NOW())
    ON CONFLICT (owner_id)
    DO UPDATE SET
        direct_sale_balance = wallets.direct_sale_balance + commission_amount,
        total_balance = wallets.total_balance + commission_amount,
        updated_at = NOW();

    -- Create transaction record
    INSERT INTO transactions (
        wallet_id,
        wallet_type,
        type,
        amount,
        description,
        plot_id,
        status,
        created_at,
        updated_at,
        date
    ) VALUES (
        seller_id,
        'direct',
        'credit',
        commission_amount,
        CASE 
            WHEN plot_number IS NOT NULL THEN 
                'Direct commission from plot sale (6%) - Plot #' || plot_number || ' - ' || project_name
            ELSE
                'Direct commission from plot sale (6%)'
        END,
        plot_ref,
        'completed',
        NOW(),
        NOW(),
        NOW()
    );
END;
$$;

-- Recreate upsert_upline_commission with transaction logging
CREATE OR REPLACE FUNCTION upsert_upline_commission(
    upline_id UUID,
    upline_name TEXT,
    commission_amount DECIMAL,
    seller_name TEXT DEFAULT NULL,
    plot_number TEXT DEFAULT NULL,
    project_name TEXT DEFAULT NULL,
    commission_level INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    plot_ref UUID;
    level_percentage TEXT;
BEGIN
    -- Get plot_id if plot details provided
    IF plot_number IS NOT NULL AND project_name IS NOT NULL THEN
        SELECT id INTO plot_ref 
        FROM plots 
        WHERE plots.plot_number = upsert_upline_commission.plot_number 
          AND plots.project_name = upsert_upline_commission.project_name
        LIMIT 1;
    END IF;

    -- Determine percentage based on level
    level_percentage := CASE commission_level
        WHEN 1 THEN '2%'
        WHEN 2 THEN '0.5%'
        ELSE '0%'
    END;

    -- Insert or update wallet
    INSERT INTO wallets (owner_id, direct_sale_balance, downline_sale_balance, total_balance, created_at, updated_at)
    VALUES (upline_id, 0, commission_amount, commission_amount, NOW(), NOW())
    ON CONFLICT (owner_id)
    DO UPDATE SET
        downline_sale_balance = wallets.downline_sale_balance + commission_amount,
        total_balance = wallets.total_balance + commission_amount,
        updated_at = NOW();

    -- Create transaction record
    INSERT INTO transactions (
        wallet_id,
        wallet_type,
        type,
        amount,
        description,
        plot_id,
        status,
        created_at,
        updated_at,
        date
    ) VALUES (
        upline_id,
        'downline',
        'credit',
        commission_amount,
        CASE 
            WHEN plot_number IS NOT NULL AND seller_name IS NOT NULL THEN 
                'Level ' || commission_level || ' upline commission (' || level_percentage || ') - Sale by ' || seller_name || ' - Plot #' || plot_number || ' - ' || project_name
            WHEN seller_name IS NOT NULL THEN
                'Level ' || commission_level || ' upline commission (' || level_percentage || ') - Sale by ' || seller_name
            ELSE
                'Level ' || commission_level || ' upline commission (' || level_percentage || ')'
        END,
        plot_ref,
        'completed',
        NOW(),
        NOW(),
        NOW()
    );
END;
$$;

-- STEP 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_plot_id ON transactions(plot_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
