-- Create upsert_wallet_balance RPC function for safe wallet updates
-- This function atomically updates wallet balances and ensures consistency

CREATE OR REPLACE FUNCTION upsert_wallet_balance(
    wallet_id UUID,
    wallet_type TEXT,
    increment_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
    updated_wallet RECORD;
    new_balance DECIMAL;
BEGIN
    -- Validate inputs
    IF wallet_id IS NULL THEN
        RAISE EXCEPTION 'wallet_id cannot be null';
    END IF;
    
    IF wallet_type NOT IN ('direct', 'downline') THEN
        RAISE EXCEPTION 'wallet_type must be either "direct" or "downline"';
    END IF;

    -- Update wallet balance based on wallet_type
    IF wallet_type = 'direct' THEN
        -- Calculate new balance
        SELECT (COALESCE(direct_sale_balance, 0) + increment_amount) INTO new_balance
        FROM wallets WHERE owner_id = wallet_id;
        
        -- Prevent negative balance
        IF new_balance < 0 THEN
            RAISE EXCEPTION 'Insufficient balance in direct sale wallet. Current balance cannot support this debit.';
        END IF;
        
        -- Update wallet
        UPDATE wallets
        SET 
            direct_sale_balance = COALESCE(direct_sale_balance, 0) + increment_amount,
            total_balance = COALESCE(total_balance, 0) + increment_amount,
            updated_at = NOW()
        WHERE owner_id = wallet_id
        RETURNING * INTO updated_wallet;
        
    ELSIF wallet_type = 'downline' THEN
        -- Calculate new balance
        SELECT (COALESCE(downline_sale_balance, 0) + increment_amount) INTO new_balance
        FROM wallets WHERE owner_id = wallet_id;
        
        -- Prevent negative balance
        IF new_balance < 0 THEN
            RAISE EXCEPTION 'Insufficient balance in downline sale wallet. Current balance cannot support this debit.';
        END IF;
        
        -- Update wallet
        UPDATE wallets
        SET 
            downline_sale_balance = COALESCE(downline_sale_balance, 0) + increment_amount,
            total_balance = COALESCE(total_balance, 0) + increment_amount,
            updated_at = NOW()
        WHERE owner_id = wallet_id
        RETURNING * INTO updated_wallet;
    END IF;

    -- If wallet doesn't exist, create it
    IF updated_wallet IS NULL THEN
        IF wallet_type = 'direct' THEN
            INSERT INTO wallets (owner_id, direct_sale_balance, downline_sale_balance, total_balance, created_at, updated_at)
            VALUES (wallet_id, increment_amount, 0, increment_amount, NOW(), NOW())
            RETURNING * INTO updated_wallet;
        ELSE
            INSERT INTO wallets (owner_id, direct_sale_balance, downline_sale_balance, total_balance, created_at, updated_at)
            VALUES (wallet_id, 0, increment_amount, increment_amount, NOW(), NOW())
            RETURNING * INTO updated_wallet;
        END IF;
    END IF;

    -- Return success response
    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Wallet updated successfully',
        'wallet', JSON_BUILD_OBJECT(
            'owner_id', updated_wallet.owner_id,
            'direct_sale_balance', updated_wallet.direct_sale_balance,
            'downline_sale_balance', updated_wallet.downline_sale_balance,
            'total_balance', updated_wallet.total_balance
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'message', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_wallet_balance(UUID, TEXT, DECIMAL) TO authenticated;
