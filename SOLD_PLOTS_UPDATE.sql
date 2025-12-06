-- ============================================================================
-- UPDATE SCRIPT: Fix Sold Plots Data
-- ============================================================================
-- Based on query results showing 3 sold plots with ₹200 sale price
-- Update sold plots to have matching sale_price and sold_amount

-- First, verify which plots need fixing
SELECT 
    id,
    plot_number,
    project_name,
    status,
    price,
    sale_price,
    sold_amount,
    buyer_name
FROM plots
WHERE status = 'sold'
ORDER BY plot_number;

-- Update sold plots: set sale_price and sold_amount to be equal
-- This assumes sale_price is the correct amount (₹200 in current case)
UPDATE plots
SET sold_amount = sale_price
WHERE status = 'sold' AND (sold_amount IS NULL OR sold_amount != sale_price);

-- Verify the update worked
SELECT 
    id,
    plot_number,
    sale_price,
    sold_amount,
    CASE 
        WHEN sale_price = sold_amount THEN 'CORRECT'
        ELSE 'MISMATCH'
    END as status_check
FROM plots
WHERE status = 'sold'
ORDER BY plot_number;
