-- =============================================================
-- Deduplicate transactions keeping earliest created_at per key
-- Key definition: (wallet_id, plot_id, wallet_type, type, amount)
-- Adjust if you want description included: add description to PARTITION BY
-- =============================================================
-- Preview duplicates (run manually before deletion, not executed automatically):
-- SELECT wallet_id, plot_id, wallet_type, type, amount, COUNT(*) AS cnt
-- FROM transactions
-- GROUP BY wallet_id, plot_id, wallet_type, type, amount
-- HAVING COUNT(*) > 1
-- ORDER BY cnt DESC;

WITH ranked AS (
    SELECT id,
           wallet_id,
           plot_id,
           wallet_type,
           type,
           amount,
           description,
           created_at,
           ROW_NUMBER() OVER (
               PARTITION BY wallet_id, plot_id, wallet_type, type, amount
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM transactions
)
DELETE FROM transactions t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- Optional description normalization
-- Correct escaping of single quote inside pattern (''s) and use E string for backslashes
-- Uncomment to run if you want unified wording.
-- UPDATE transactions
-- SET description = regexp_replace(
--       description,
--       E'^Level (\\d+) commission from (.+?)''s sale$',
--       'Level \\1 upline commission – Sale by \\2',
--       'g'
-- )
-- WHERE description LIKE 'Level % commission from %''s sale';

-- Verification queries (run after):
-- SELECT wallet_id, plot_id, wallet_type, type, amount, COUNT(*) AS cnt
-- FROM transactions
-- GROUP BY wallet_id, plot_id, wallet_type, type, amount
-- HAVING COUNT(*) > 1;
