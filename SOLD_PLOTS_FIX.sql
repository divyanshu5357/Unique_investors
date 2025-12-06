-- ============================================================================
-- FIX SCRIPT: Update Sold Plots with Correct Amounts
-- ============================================================================
-- Run this in Supabase SQL Editor to fix sold plots data

-- 1. First, check all sold plots and their current values
SELECT 
    id,
    plot_number,
    project_name,
    status,
    price,
    sale_price,
    sold_amount,
    buyer_name,
    seller_name,
    commission_rate,
    created_at
FROM plots
WHERE status = 'sold'
ORDER BY plot_number DESC;

-- 2. Check if there are NULL values in sold plot fields
SELECT 
    COUNT(*) as total_sold,
    SUM(CASE WHEN sale_price IS NULL THEN 1 ELSE 0 END) as null_sale_price,
    SUM(CASE WHEN sold_amount IS NULL THEN 1 ELSE 0 END) as null_sold_amount,
    SUM(CASE WHEN sale_price = 0 THEN 1 ELSE 0 END) as zero_sale_price,
    SUM(CASE WHEN sold_amount = 0 THEN 1 ELSE 0 END) as zero_sold_amount
FROM plots
WHERE status = 'sold';

-- 3. If price field has correct values but sale_price is wrong, copy price to sale_price
-- Uncomment and run this if needed:
/*
UPDATE plots
SET sale_price = price
WHERE status = 'sold' AND price > 0 AND (sale_price = 0 OR sale_price IS NULL);

UPDATE plots
SET sold_amount = price
WHERE status = 'sold' AND price > 0 AND (sold_amount = 0 OR sold_amount IS NULL);
*/

-- 4. Alternative: If you know the correct amounts, update them directly:
-- Example: Plot #6 should be 1,00,000
-- UPDATE plots SET sale_price = 100000, sold_amount = 100000 WHERE plot_number = 6 AND status = 'sold';

-- 5. Verify payment history for sold plots
SELECT 
    p.plot_number,
    p.buyer_name,
    p.sale_price,
    p.sold_amount,
    ph.amount_received,
    ph.payment_date
FROM plots p
LEFT JOIN payment_history ph ON p.id = ph.plot_id
WHERE p.status = 'sold'
ORDER BY p.plot_number DESC;
