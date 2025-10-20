-- Migration: Add Booked Plots Management System
-- This migration adds support for tracking booked plots, payment history, and pending commissions

-- 0. First, drop the existing status check constraint and add 'booked' to allowed values
ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_status_check;
ALTER TABLE public.plots 
ADD CONSTRAINT plots_status_check CHECK (status IN ('available', 'booked', 'sold', 'reserved'));

-- 1. Add new columns to plots table for booking management
ALTER TABLE public.plots 
ADD COLUMN IF NOT EXISTS total_plot_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS booking_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS tenure_months INTEGER,
ADD COLUMN IF NOT EXISTS paid_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'pending' CHECK (commission_status IN ('pending', 'paid')),
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for broker_id for faster queries
CREATE INDEX IF NOT EXISTS idx_plots_broker_id ON plots(broker_id);
CREATE INDEX IF NOT EXISTS idx_plots_commission_status ON plots(commission_status);

-- Add comment to track the purpose
COMMENT ON COLUMN public.plots.total_plot_amount IS 'Total amount of the plot';
COMMENT ON COLUMN public.plots.booking_amount IS 'Initial booking amount paid';
COMMENT ON COLUMN public.plots.remaining_amount IS 'Amount remaining to be paid';
COMMENT ON COLUMN public.plots.tenure_months IS 'Number of months allowed to complete payment';
COMMENT ON COLUMN public.plots.paid_percentage IS 'Percentage of total amount paid';
COMMENT ON COLUMN public.plots.commission_status IS 'Status of commission: pending (not paid) or paid (distributed)';
COMMENT ON COLUMN public.plots.buyer_name IS 'Name of the buyer/client';
COMMENT ON COLUMN public.plots.broker_id IS 'ID of the broker who sold/booked the plot';

-- 2. Create payment_history table to track all payments for booked plots
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    buyer_name TEXT NOT NULL,
    broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    amount_received DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_history_plot_id ON payment_history(plot_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_broker_id ON payment_history(broker_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);

-- Add comment
COMMENT ON TABLE public.payment_history IS 'Tracks all payment transactions for booked plots';

-- 3. Create a function to automatically update remaining_amount and paid_percentage
CREATE OR REPLACE FUNCTION update_plot_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(12, 2);
    plot_total DECIMAL(12, 2);
    new_percentage DECIMAL(5, 2);
    new_remaining DECIMAL(12, 2);
BEGIN
    -- Get the total plot amount
    SELECT total_plot_amount INTO plot_total
    FROM plots
    WHERE id = NEW.plot_id;

    -- Calculate total amount paid so far
    SELECT COALESCE(SUM(amount_received), 0) INTO total_paid
    FROM payment_history
    WHERE plot_id = NEW.plot_id;

    -- Calculate percentage and remaining amount
    IF plot_total > 0 THEN
        new_percentage := (total_paid / plot_total) * 100;
        new_remaining := plot_total - total_paid;
    ELSE
        new_percentage := 0;
        new_remaining := 0;
    END IF;

    -- Update the plots table
    UPDATE plots
    SET 
        remaining_amount = new_remaining,
        paid_percentage = new_percentage,
        updated_at = NOW()
    WHERE id = NEW.plot_id;

    -- If 75% or more is paid, change status to 'Sold' and mark commission as ready to be distributed
    IF new_percentage >= 75 AND (SELECT status FROM plots WHERE id = NEW.plot_id) = 'booked' THEN
        UPDATE plots
        SET 
            status = 'sold',
            updated_at = NOW()
        WHERE id = NEW.plot_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to run the function after payment is added
DROP TRIGGER IF EXISTS trigger_update_payment_status ON payment_history;
CREATE TRIGGER trigger_update_payment_status
    AFTER INSERT OR UPDATE ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_plot_payment_status();

-- 5. Add RLS policies for payment_history table
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to payment history" ON payment_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Brokers can view their own plot payment histories
CREATE POLICY "Broker can view own plot payments" ON payment_history
    FOR SELECT USING (
        broker_id = auth.uid()
    );

-- 6. Update existing RLS policies for plots table to include broker access
CREATE POLICY "Broker can view own plots" ON plots
    FOR SELECT USING (
        broker_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'broker')
    );
