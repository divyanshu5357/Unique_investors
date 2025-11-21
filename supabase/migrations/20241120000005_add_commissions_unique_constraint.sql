-- Deduplicate any existing duplicate commission rows before adding constraint
WITH duplicates AS (
    SELECT plot_id, receiver_id, level, MIN(id) AS keep_id, ARRAY_AGG(id) AS all_ids
    FROM commissions
    GROUP BY plot_id, receiver_id, level
    HAVING COUNT(*) > 1
)
DELETE FROM commissions c
USING duplicates d
WHERE c.plot_id = d.plot_id
  AND c.receiver_id = d.receiver_id
  AND c.level = d.level
  AND c.id <> d.keep_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE commissions
ADD CONSTRAINT commissions_plot_receiver_level_unique UNIQUE (plot_id, receiver_id, level);

-- Optional: index to speed lookups by plot
CREATE INDEX IF NOT EXISTS idx_commissions_plot_id ON commissions(plot_id);
