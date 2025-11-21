-- Fix duplicate commissions and incorrect plot data
-- Run this in Supabase SQL Editor

-- 1. Find and show duplicate commission records
SELECT 
    receiver_id,
    sale_amount,
    percentage,
    amount,
    created_at,
    COUNT(*) as duplicate_count
FROM commissions
GROUP BY receiver_id, sale_amount, percentage, amount, created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC;

-- 2. Delete duplicate commissions (keeping only the first one for each set)
DELETE FROM commissions
WHERE id::text NOT IN (
    SELECT MIN(id::text)
    FROM commissions
    GROUP BY receiver_id, seller_id, plot_id, sale_amount, percentage, level, created_at
);

-- 3. Fix Plot #42 - Update status to sold and set correct sale price
-- Replace 'plot-42-id-here' with actual plot ID from your database
UPDATE plots
SET 
    status = 'sold',
    sale_price = total_plot_amount,
    updated_at = NOW()
WHERE 
    plot_number = '42' 
    AND project_name = 'Green Enclave'
    AND status = 'booked';

-- 4. Show all plots with mismatched status (booked but should be sold based on 75%+ payment)
SELECT 
    id,
    project_name,
    plot_number,
    status,
    paid_percentage,
    total_plot_amount,
    remaining_amount,
    commission_status
FROM plots
WHERE 
    status = 'booked' 
    AND paid_percentage >= 75
ORDER BY project_name, plot_number;

-- 5. Fix all plots that should be marked as sold (75%+ paid)
UPDATE plots
SET 
    status = 'sold',
    updated_at = NOW()
WHERE 
    status = 'booked' 
    AND paid_percentage >= 75;

-- 6. Verify commission amounts are correct (should be 6% of sale amount for direct sales)
SELECT 
    c.id,
    c.receiver_id,
    p.full_name as receiver_name,
    c.sale_amount,
    c.percentage,
    c.amount as commission_amount,
    c.level,
    (c.sale_amount * c.percentage / 100) as expected_amount,
    CASE 
        WHEN ABS(c.amount - (c.sale_amount * c.percentage / 100)) < 0.01 THEN '✅ Correct'
        ELSE '❌ Wrong'
    END as status
FROM commissions c
LEFT JOIN profiles p ON p.id = c.receiver_id
ORDER BY c.created_at DESC
LIMIT 20;
