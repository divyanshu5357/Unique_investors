-- Database Schema for Payment Installments
-- This schema supports the PaymentInstallmentDrawer component

-- Create installments table (if not exists)
CREATE TABLE IF NOT EXISTS plot_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    installment_date TIMESTAMP NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
    late_fee DECIMAL(15, 2) DEFAULT 0,
    payment_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for common queries
CREATE INDEX idx_plot_installments_plot_id ON plot_installments(plot_id);
CREATE INDEX idx_plot_installments_status ON plot_installments(status);
CREATE INDEX idx_plot_installments_date ON plot_installments(installment_date);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_plot_installments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plot_installments_updated_at
BEFORE UPDATE ON plot_installments
FOR EACH ROW
EXECUTE FUNCTION update_plot_installments_updated_at();

-- Create payment receipts table (for document storage)
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID NOT NULL REFERENCES plot_installments(id) ON DELETE CASCADE,
    receipt_file_url TEXT,
    receipt_file_name VARCHAR(255),
    receipt_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_payment_receipts_installment_id ON payment_receipts(installment_id);

-- Create payment history tracking table (for audit)
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    installment_id UUID REFERENCES plot_installments(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_payment_history_plot_id ON payment_history(plot_id);
CREATE INDEX idx_payment_history_date ON payment_history(created_at);

-- Sample insert queries for testing

-- Insert sample installments for a booked plot
-- First, get a booked plot ID:
-- SELECT id FROM plots WHERE status = 'booked' LIMIT 1;

-- Then insert installments:
INSERT INTO plot_installments (
    plot_id,
    installment_number,
    installment_date,
    amount,
    payment_method,
    receipt_number,
    status,
    late_fee,
    payment_date
) VALUES
    (
        'your-plot-id-here',
        1,
        NOW() - INTERVAL '30 days',
        100000,
        'Bank Transfer',
        'REC-001-2024',
        'paid',
        0,
        NOW() - INTERVAL '30 days'
    ),
    (
        'your-plot-id-here',
        2,
        NOW() - INTERVAL '15 days',
        100000,
        'Cheque',
        'REC-002-2024',
        'paid',
        0,
        NOW() - INTERVAL '15 days'
    ),
    (
        'your-plot-id-here',
        3,
        NOW() + INTERVAL '15 days',
        100000,
        NULL,
        NULL,
        'unpaid',
        5000,
        NULL
    ),
    (
        'your-plot-id-here',
        4,
        NOW() + INTERVAL '45 days',
        100000,
        NULL,
        NULL,
        'unpaid',
        0,
        NULL
    );

-- SQL Queries for PaymentInstallmentDrawer

-- Get all installments for a plot
SELECT * FROM plot_installments
WHERE plot_id = $1
ORDER BY installment_number ASC;

-- Get payment summary for a plot
SELECT
    COUNT(*) as total_installments,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
    COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
    SUM(CASE WHEN status IN ('paid', 'partial') THEN amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_unpaid,
    SUM(late_fee) as total_late_fees
FROM plot_installments
WHERE plot_id = $1;

-- Get next due installment
SELECT * FROM plot_installments
WHERE plot_id = $1 AND status = 'unpaid'
ORDER BY installment_date ASC
LIMIT 1;

-- Get paid installments for a plot
SELECT * FROM plot_installments
WHERE plot_id = $1 AND status IN ('paid', 'partial')
ORDER BY installment_date ASC;

-- Get installments due within 30 days
SELECT * FROM plot_installments
WHERE plot_id = $1
    AND status = 'unpaid'
    AND installment_date <= NOW() + INTERVAL '30 days'
ORDER BY installment_date ASC;

-- Update installment payment status
UPDATE plot_installments
SET
    status = $2,
    payment_date = NOW(),
    payment_method = $3,
    receipt_number = $4,
    updated_by = $5
WHERE id = $1;

-- Record late fee
UPDATE plot_installments
SET
    late_fee = $2,
    updated_by = $3
WHERE id = $1;

-- RLS (Row Level Security) Policies for installments

-- Policy 1: Admins can view all installments
CREATE POLICY "admin_view_all_installments" ON plot_installments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 2: Brokers can view installments for their booked/sold plots
CREATE POLICY "broker_view_own_installments" ON plot_installments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM plots
        JOIN profiles ON plots.broker_id = profiles.id
        WHERE plots.id = plot_installments.plot_id
        AND profiles.id = auth.uid()
        AND plots.status IN ('booked', 'sold')
    )
);

-- Policy 3: Admins can insert installments
CREATE POLICY "admin_insert_installments" ON plot_installments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 4: Admins can update installments
CREATE POLICY "admin_update_installments" ON plot_installments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy 5: Admins can delete installments
CREATE POLICY "admin_delete_installments" ON plot_installments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Enable RLS on tables
ALTER TABLE plot_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Similar RLS policies for payment_receipts and payment_history tables
-- ...
