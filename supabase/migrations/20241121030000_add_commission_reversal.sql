-- Migration: Add reversal tracking columns for commissions & transactions
-- Purpose: Support safe reversal when a sold plot reverts to booked/available
-- Adds: is_reversed flag + reversed_at timestamp

-- Commissions table updates
ALTER TABLE commissions
    ADD COLUMN IF NOT EXISTS is_reversed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

-- Transactions table updates
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS is_reversed boolean DEFAULT false;

-- Optional: widen status domain (if using enum) - if status is plain text no change required.
-- If status is an ENUM, the following would be needed (commented out since unknown):
-- DO $$ BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
--         CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
--     ELSE
--         -- Add new value if missing
--         ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'reversed';
--     END IF;
-- END $$;

-- If transactions.status is already an enum without reversed, consider manual adjustment.
-- This migration assumes plain text column.

-- Index to speed up reversal queries
CREATE INDEX IF NOT EXISTS idx_commissions_plot_is_reversed ON commissions(plot_id, is_reversed);
CREATE INDEX IF NOT EXISTS idx_transactions_plot_is_reversed ON transactions(plot_id, is_reversed);
