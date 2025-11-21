-- Add unique constraint for plot uniqueness (project_name + plot_number)
-- First, we need to handle existing duplicates if any
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'plots_project_plot_unique'
    ) THEN
        -- Add unique constraint
        ALTER TABLE plots 
        ADD CONSTRAINT plots_project_plot_unique 
        UNIQUE (project_name, plot_number);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_plots_broker_id ON plots(broker_id);
CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status);
CREATE INDEX IF NOT EXISTS idx_plots_project_name ON plots(project_name);
CREATE INDEX IF NOT EXISTS idx_plots_created_at ON plots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON wallets(owner_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_plot_id ON transactions(plot_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_broker_id ON withdrawal_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

CREATE INDEX IF NOT EXISTS idx_commissions_receiver_id ON commissions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_commissions_plot_id ON commissions(plot_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_plot_id ON payment_history(plot_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_broker_id ON payment_history(broker_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_sponsorid ON profiles(sponsorid);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_plots_status_broker ON plots(status, broker_id);
CREATE INDEX IF NOT EXISTS idx_plots_project_status ON plots(project_name, status);
