-- Data migration script to move Firebase collections to Supabase
-- Run this after creating the tables

-- Example: Insert sample data (you'll need to export from Firebase first)

-- 1. Sample plots data (replace with your exported Firebase data)
INSERT INTO plots (project_name, plot_number, area, facing, status, price, created_at) VALUES
('Sample Project 1', 'P001', 1000.00, 'North', 'available', 500000.00, NOW()),
('Sample Project 1', 'P002', 1200.00, 'South', 'sold', 600000.00, NOW())
ON CONFLICT (project_name, plot_number) DO NOTHING;

-- 2. Create wallets for existing brokers
INSERT INTO wallets (owner_id, direct_sale_balance, downline_sale_balance, total_balance)
SELECT 
    id,
    0.00,
    0.00,
    0.00
FROM profiles 
WHERE role = 'broker'
ON CONFLICT (owner_id) DO NOTHING;

-- 3. Sample testimonials
INSERT INTO testimonials (name, role, content, rating, is_featured) VALUES
('John Doe', 'Happy Customer', 'Great service and excellent plots!', 5, true),
('Jane Smith', 'Investor', 'Professional team and transparent process.', 4, false)
ON CONFLICT DO NOTHING;