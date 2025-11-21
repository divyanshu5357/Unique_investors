-- Enable RLS for payment_history table
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Admin has full access to payment history
CREATE POLICY "Admin full access to payment_history" ON payment_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Brokers can view payment history for their own plots
CREATE POLICY "Broker can view own payment history" ON payment_history
    FOR SELECT USING (
        broker_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admin can insert payment records
CREATE POLICY "Admin can insert payment_history" ON payment_history
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admin can update payment records
CREATE POLICY "Admin can update payment_history" ON payment_history
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Only admin can delete payment records
CREATE POLICY "Admin can delete payment_history" ON payment_history
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
