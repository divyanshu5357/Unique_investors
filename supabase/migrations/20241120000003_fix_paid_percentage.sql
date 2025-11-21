-- Fix Paid Percentage Calculation
-- This script recalculates all paid_percentage values based on actual payment_history records
-- Run this in Supabase SQL Editor if you see incorrect percentage values (like 225.1%)

-- 1. First, let's see which plots have incorrect paid_percentage values
SELECT 
    p.id,
    p.project_name,
    p.plot_number,
    p.total_plot_amount,
    p.remaining_amount,
    p.paid_percentage as current_percentage,
    COALESCE(SUM(ph.amount_received), 0) as actual_paid,
    CASE 
        WHEN p.total_plot_amount > 0 THEN 
            (COALESCE(SUM(ph.amount_received), 0) / p.total_plot_amount * 100)
        ELSE 0 
    END as correct_percentage,
    p.status
FROM plots p
LEFT JOIN payment_history ph ON ph.plot_id = p.id
GROUP BY p.id, p.project_name, p.plot_number, p.total_plot_amount, p.remaining_amount, p.paid_percentage, p.status
HAVING 
    ABS(p.paid_percentage - 
        CASE 
            WHEN p.total_plot_amount > 0 THEN 
                (COALESCE(SUM(ph.amount_received), 0) / p.total_plot_amount * 100)
            ELSE 0 
        END
    ) > 0.01  -- Show plots where difference is more than 0.01%
ORDER BY p.project_name, p.plot_number;

-- 2. Fix all plots with incorrect paid_percentage values
-- This updates remaining_amount and paid_percentage based on actual payments
UPDATE plots p
SET 
    paid_percentage = CASE 
        WHEN p.total_plot_amount > 0 THEN 
            (COALESCE(
                (SELECT SUM(amount_received) FROM payment_history WHERE plot_id = p.id),
                0
            ) / p.total_plot_amount * 100)
        ELSE 0 
    END,
    remaining_amount = p.total_plot_amount - COALESCE(
        (SELECT SUM(amount_received) FROM payment_history WHERE plot_id = p.id),
        0
    ),
    updated_at = NOW()
WHERE TRUE;  -- Update all plots

-- 3. Update plot status based on corrected paid_percentage
-- If 75% or more is paid, mark as 'sold'
UPDATE plots
SET 
    status = 'sold',
    updated_at = NOW()
WHERE 
    paid_percentage >= 75 
    AND status = 'booked';

-- 4. Verify the fix - check for any remaining anomalies
SELECT 
    p.id,
    p.project_name,
    p.plot_number,
    p.total_plot_amount,
    p.remaining_amount,
    p.paid_percentage,
    COALESCE(SUM(ph.amount_received), 0) as total_paid,
    p.status
FROM plots p
LEFT JOIN payment_history ph ON ph.plot_id = p.id
GROUP BY p.id, p.project_name, p.plot_number, p.total_plot_amount, p.remaining_amount, p.paid_percentage, p.status
HAVING 
    p.paid_percentage > 100  -- Should be no plots with > 100%
    OR p.paid_percentage < 0  -- Should be no plots with negative percentage
    OR (p.remaining_amount < 0)  -- Should be no plots with negative remaining amount
ORDER BY p.paid_percentage DESC;

-- 5. Summary report after fix
SELECT 
    status,
    COUNT(*) as plot_count,
    ROUND(AVG(paid_percentage), 2) as avg_percentage,
    ROUND(MIN(paid_percentage), 2) as min_percentage,
    ROUND(MAX(paid_percentage), 2) as max_percentage,
    SUM(total_plot_amount) as total_value,
    SUM(remaining_amount) as total_remaining
FROM plots
GROUP BY status
ORDER BY status;
