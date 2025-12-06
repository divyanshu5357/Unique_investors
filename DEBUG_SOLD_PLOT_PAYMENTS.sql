-- Debug: Check payment_history table structure and data for sold plots

-- 1. Check table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_history'
ORDER BY ordinal_position;

-- 2. Find a sold plot
SELECT id, plot_number, buyer_name, status, sale_price, sold_amount, paid_percentage
FROM plots
WHERE status = 'sold'
LIMIT 5;

-- 3. Check payment records for sold plots
-- Replace 'PLOT_ID' with actual sold plot ID from above
SELECT * FROM payment_history
WHERE plot_id = 'PLOT_ID'
ORDER BY payment_date ASC;

-- 4. Check if there are ANY payment records at all
SELECT COUNT(*) as total_payment_records FROM payment_history;

-- 5. List all columns in payment_history table
\d payment_history

-- 6. Sample records from payment_history
SELECT * FROM payment_history LIMIT 10;
