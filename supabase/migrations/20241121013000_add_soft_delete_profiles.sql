-- Soft delete support for profiles and safe delete function
BEGIN;

-- 1. Add deleted_at column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Index to accelerate queries filtering out deleted profiles
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp marking profile as soft-deleted; NULL means active';

-- 3. Ensure critical foreign keys referencing profiles use SET NULL (handled earlier but reassert defensively)
ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_updated_by_fkey;
ALTER TABLE public.plots ADD CONSTRAINT plots_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_created_by_fkey;
ALTER TABLE public.plots ADD CONSTRAINT plots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_broker_id_fkey;
ALTER TABLE public.plots ADD CONSTRAINT plots_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.payment_history DROP CONSTRAINT IF EXISTS payment_history_updated_by_fkey;
ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.payment_history DROP CONSTRAINT IF EXISTS payment_history_broker_id_fkey;
ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_sponsorid_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_sponsorid_fkey FOREIGN KEY (sponsorid) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Safe delete function: nullify outward references then soft delete
CREATE OR REPLACE FUNCTION public.safe_delete_profile(p_profile_id UUID, p_actor UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- If already deleted, do nothing
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id AND deleted_at IS NOT NULL) THEN
        RETURN;
    END IF;

    -- Nullify sponsorships
    UPDATE public.profiles SET sponsorid = NULL WHERE sponsorid = p_profile_id;

    -- Nullify plot relationships
    UPDATE public.plots SET updated_by = NULL WHERE updated_by = p_profile_id;
    UPDATE public.plots SET created_by = NULL WHERE created_by = p_profile_id;
    UPDATE public.plots SET broker_id = NULL WHERE broker_id = p_profile_id;

    -- Nullify payment history references
    UPDATE public.payment_history SET updated_by = NULL WHERE updated_by = p_profile_id;
    UPDATE public.payment_history SET broker_id = NULL WHERE broker_id = p_profile_id;

    -- Mark profile deleted
    UPDATE public.profiles SET deleted_at = NOW(), updated_at = NOW() WHERE id = p_profile_id;

    -- Optional: record audit trail (simple row in an audit table) - create table if desired
    -- INSERT INTO profile_deletion_audit(profile_id, actor_id, deleted_at) VALUES (p_profile_id, p_actor, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. (Optional) Active profiles view (exclude soft-deleted)
CREATE OR REPLACE VIEW public.active_profiles AS
SELECT * FROM public.profiles WHERE deleted_at IS NULL;

COMMIT;
