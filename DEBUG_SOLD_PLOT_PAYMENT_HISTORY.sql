-- Debug: Check payment history for sold plots

-- 1. Get all sold plots
SELECT id, plot_number, buyer_name, status, sale_price, sold_amount
FROM plots
WHERE status = 'sold'
LIMIT 10;

-- 2. For each sold plot, check if there are payment records
-- Replace with actual sold plot ID
SELECT ph.id, ph.amount_received, ph.payment_date, ph.notes, ph.buyer_name
FROM payment_history ph
WHERE ph.plot_id IN (
    SELECT id FROM plots WHERE status = 'sold'
)
ORDER BY ph.payment_date ASC;

-- 3. Count payment records for sold vs booked plots
SELECT 
    p.status,
    COUNT(p.id) as total_plots,
    COUNT(ph.id) as plots_with_payments,
    COUNT(CASE WHEN ph.id IS NOT NULL THEN 1 END) as payment_records
FROM plots p
LEFT JOIN payment_history ph ON p.id = ph.plot_id
GROUP BY p.status;

-- 4. Check if sold plots have ANY records in payment_history
SELECT p.id, p.plot_number, p.status, COUNT(ph.id) as payment_count
FROM plots p
LEFT JOIN payment_history ph ON p.id = ph.plot_id
WHERE p.status = 'sold'
GROUP BY p.id, p.plot_number, p.status
ORDER BY payment_count DESC;
