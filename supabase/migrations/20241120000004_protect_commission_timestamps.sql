-- Protect commission created_at timestamps from being modified
-- This trigger ensures that once a commission is created, its created_at timestamp
-- can never be changed, even during updates or recalculations

CREATE OR REPLACE FUNCTION prevent_created_at_update()
RETURNS trigger AS $$
BEGIN
    -- Always preserve the original created_at timestamp
    NEW.created_at := OLD.created_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to commissions table
CREATE TRIGGER no_update_created_at_commissions
BEFORE UPDATE ON commissions
FOR EACH ROW
EXECUTE FUNCTION prevent_created_at_update();

-- Also protect transactions table timestamps
CREATE TRIGGER no_update_created_at_transactions
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_created_at_update();

-- Add comment for documentation
COMMENT ON FUNCTION prevent_created_at_update() IS 'Prevents modification of created_at timestamps to maintain accurate historical records';
