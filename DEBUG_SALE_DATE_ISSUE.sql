-- Debug: Check what data exists in payment_history

-- 1. Check payment_history table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_history'
ORDER BY ordinal_position;

-- 2. Get sample payment records to see what data exists
SELECT id, plot_id, buyer_name, payment_date, amount_received
FROM payment_history
LIMIT 10;

-- 3. Check specifically for the plot that's showing N/A
-- Replace 'PLOT_ID' with actual plot UUID
SELECT id, plot_id, buyer_name, payment_date, amount_received, notes, created_at
FROM payment_history
WHERE plot_id = 'PLOT_ID'
ORDER BY payment_date DESC;

-- 4. Check the plots table for sale_date
SELECT id, plot_number, status, buyer_name, sale_date, sale_price, sold_amount
FROM plots
WHERE status = 'sold'
LIMIT 10;

-- 5. Compare: plots vs payment_history
SELECT 
    p.id,
    p.plot_number,
    p.buyer_name as plot_buyer,
    p.sale_date as plot_sale_date,
    MAX(ph.buyer_name) as payment_buyer,
    MAX(ph.payment_date) as payment_date
FROM plots p
LEFT JOIN payment_history ph ON p.id = ph.plot_id
WHERE p.status = 'sold'
GROUP BY p.id, p.plot_number, p.buyer_name, p.sale_date
LIMIT 10;
