-- Check the actual structure of payment_history table

-- Method 1: Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_history'
ORDER BY ordinal_position;

-- Method 2: Describe table (if available)
-- \d payment_history

-- Method 3: Get sample data to see what columns exist
SELECT * FROM payment_history LIMIT 5;

-- Method 4: Check all tables that contain 'payment' in name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%payment%';
