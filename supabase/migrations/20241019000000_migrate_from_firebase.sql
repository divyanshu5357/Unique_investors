-- Migration from Firebase to Supabase
-- This creates all the tables needed to replace Firebase collections

-- 1. Plots table (replaces Firebase 'plots' collection)
CREATE TABLE IF NOT EXISTS plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    plot_number TEXT NOT NULL,
    area DECIMAL(10,2),
    facing TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
    price DECIMAL(12,2),
    sale_price DECIMAL(12,2),
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_email TEXT,
    sale_date DATE,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint for project + plot number
    UNIQUE(project_name, plot_number)
);

-- 2. Wallets table (replaces Firebase 'wallets' collection)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    direct_sale_balance DECIMAL(12,2) DEFAULT 0.00,
    downline_sale_balance DECIMAL(12,2) DEFAULT 0.00,
    total_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions table (replaces Firebase 'transactions' collection)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(owner_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'commission', 'withdrawal')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- For linking to sales, commissions, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Withdrawal requests table (replaces Firebase 'withdrawal_requests' collection)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    broker_name TEXT NOT NULL,
    broker_email TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    payment_type TEXT,
    proof_image_url TEXT,
    processed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Broker verifications table (replaces Firebase 'broker_verifications' collection)
CREATE TABLE IF NOT EXISTS broker_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    broker_name TEXT NOT NULL,
    broker_email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    id_type TEXT NOT NULL CHECK (id_type IN ('aadhar', 'pan', 'passport', 'driving_license')),
    id_number TEXT NOT NULL,
    id_image_data TEXT, -- Base64 encoded image or URL
    id_image_type TEXT DEFAULT 'image/jpeg',
    id_image_size INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    -- Only one verification per broker
    UNIQUE(broker_id)
);

-- 6. Broker referrals table (replaces Firebase 'brokerReferrals' collection)
CREATE TABLE IF NOT EXISTS broker_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    referrer_name TEXT NOT NULL,
    referrer_email TEXT NOT NULL,
    referred_name TEXT NOT NULL,
    referred_email TEXT NOT NULL,
    referred_phone TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    username TEXT,
    password TEXT,
    role TEXT DEFAULT 'broker',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 7. Commissions table (replaces Firebase 'commissions' collection)
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_name TEXT NOT NULL,
    seller_id UUID REFERENCES profiles(id),
    seller_name TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0),
    level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
    sale_amount DECIMAL(12,2) NOT NULL,
    plot_id UUID REFERENCES plots(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Testimonials table (replaces Firebase 'testimonials' collection)
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status);
CREATE INDEX IF NOT EXISTS idx_plots_project_plot ON plots(project_name, plot_number);
CREATE INDEX IF NOT EXISTS idx_plots_created_by ON plots(created_by);
CREATE INDEX IF NOT EXISTS idx_plots_updated_by ON plots(updated_by);

CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON wallets(owner_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_broker_id ON withdrawal_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

CREATE INDEX IF NOT EXISTS idx_broker_verifications_broker_id ON broker_verifications(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_verifications_status ON broker_verifications(status);

CREATE INDEX IF NOT EXISTS idx_broker_referrals_referrer_id ON broker_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_broker_referrals_status ON broker_referrals(status);

CREATE INDEX IF NOT EXISTS idx_commissions_receiver_id ON commissions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_id ON commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_level ON commissions(level);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON plots FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Admin can access all data
CREATE POLICY "Admin full access" ON plots FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON wallets FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON withdrawal_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON broker_verifications FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON broker_referrals FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON commissions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin full access" ON testimonials FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Brokers can access their own data
CREATE POLICY "Broker own wallet" ON wallets FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Broker own transactions" ON transactions FOR SELECT USING (wallet_id = auth.uid());
CREATE POLICY "Broker own withdrawals" ON withdrawal_requests FOR ALL USING (broker_id = auth.uid());
CREATE POLICY "Broker own verification" ON broker_verifications FOR ALL USING (broker_id = auth.uid());
CREATE POLICY "Broker own referrals" ON broker_referrals FOR ALL USING (referrer_id = auth.uid());
CREATE POLICY "Broker own commissions" ON commissions FOR SELECT USING (receiver_id = auth.uid());

-- Public read access to testimonials
CREATE POLICY "Public testimonials read" ON testimonials FOR SELECT USING (true);