-- ============================================================================
-- DEBUG SCRIPT: Check if booked plots have data in required columns
-- ============================================================================
-- Run this in Supabase SQL Editor to check the data

-- 1. Check the structure of plots table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'plots' 
ORDER BY ordinal_position;

-- 2. Check all booked plots and their amounts
SELECT 
    id,
    plot_number,
    project_name,
    status,
    total_plot_amount,
    booking_amount,
    remaining_amount,
    paid_percentage,
    buyer_name,
    created_at
FROM plots
WHERE status = 'booked'
ORDER BY created_at DESC;

-- 3. Check sold plots and their amounts
SELECT 
    id,
    plot_number,
    project_name,
    status,
    sale_price,
    sold_amount,
    buyer_name,
    created_at
FROM plots
WHERE status = 'sold'
ORDER BY created_at DESC;

-- 4. Check payment history for booked plots
SELECT 
    ph.plot_id,
    p.plot_number,
    p.buyer_name,
    SUM(ph.amount_received) as total_paid,
    COUNT(*) as num_payments,
    p.total_plot_amount,
    p.booking_amount
FROM payment_history ph
JOIN plots p ON p.id = ph.plot_id
WHERE p.status = 'booked'
GROUP BY ph.plot_id, p.plot_number, p.buyer_name, p.total_plot_amount, p.booking_amount
ORDER BY p.plot_number DESC;

-- 5. Check if there are any NULL values in key fields
SELECT 
    COUNT(*) as total_booked,
    SUM(CASE WHEN total_plot_amount IS NULL THEN 1 ELSE 0 END) as null_total_amount,
    SUM(CASE WHEN booking_amount IS NULL THEN 1 ELSE 0 END) as null_booking_amount,
    SUM(CASE WHEN paid_percentage IS NULL THEN 1 ELSE 0 END) as null_paid_percentage
FROM plots
WHERE status = 'booked';
