-- Migration: Fix plot status change trigger to only mark as 'sold' at 100% payment
-- Previously: Changed to 'sold' at 75%
-- Now: Only changes to 'sold' at 100% (commission still distributed at 75%)

-- Update the trigger function to change status to 'sold' only at 100% payment
CREATE OR REPLACE FUNCTION update_plot_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(12, 2);
    plot_total DECIMAL(12, 2);
    new_percentage DECIMAL(5, 2);
    new_remaining DECIMAL(12, 2);
BEGIN
    -- Get the total plot amount
    SELECT total_plot_amount INTO plot_total
    FROM plots
    WHERE id = NEW.plot_id;

    -- Calculate total amount paid so far
    SELECT COALESCE(SUM(amount_received), 0) INTO total_paid
    FROM payment_history
    WHERE plot_id = NEW.plot_id;

    -- Calculate percentage and remaining amount
    IF plot_total > 0 THEN
        new_percentage := (total_paid / plot_total) * 100;
        new_remaining := plot_total - total_paid;
    ELSE
        new_percentage := 0;
        new_remaining := 0;
    END IF;

    -- Update the plots table
    UPDATE plots
    SET 
        remaining_amount = new_remaining,
        paid_percentage = new_percentage,
        updated_at = NOW()
    WHERE id = NEW.plot_id;

    -- CHANGED: Only change status to 'sold' when 100% is paid (not 75%)
    -- Commission will still be distributed at 75% by the application code
    IF new_percentage >= 100 AND (SELECT status FROM plots WHERE id = NEW.plot_id) = 'booked' THEN
        UPDATE plots
        SET 
            status = 'sold',
            updated_at = NOW()
        WHERE id = NEW.plot_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger is already created, this just updates the function
COMMENT ON FUNCTION update_plot_payment_status() IS 'Updates plot payment status. Changes to sold only at 100% payment (commission distributed at 75% by app).';
