-- Disable the DELETE trigger on plots since ON DELETE CASCADE handles cleanup
-- The trigger was causing foreign key constraint violations when deleting plots

DROP TRIGGER IF EXISTS plot_history_trigger_delete ON public.plots;

-- The INSERT and UPDATE triggers are kept as they provide audit history
-- Only the DELETE trigger is removed to avoid the cascade conflict
