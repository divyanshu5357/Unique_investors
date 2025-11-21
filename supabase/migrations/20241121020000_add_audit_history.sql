-- Audit history for plots and brokers
BEGIN;

-- Plot history table
CREATE TABLE IF NOT EXISTS public.plot_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created','updated','status_change','booked','sold','canceled','deleted')),
    old_status TEXT,
    new_status TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plot_history_plot ON public.plot_history(plot_id);
CREATE INDEX IF NOT EXISTS idx_plot_history_action ON public.plot_history(action);
CREATE INDEX IF NOT EXISTS idx_plot_history_created_at ON public.plot_history(created_at DESC);

-- Broker history table
CREATE TABLE IF NOT EXISTS public.broker_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created','updated','soft_deleted','restored')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    details JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_broker_history_broker ON public.broker_history(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_history_action ON public.broker_history(action);
CREATE INDEX IF NOT EXISTS idx_broker_history_occurred_at ON public.broker_history(occurred_at DESC);

-- Function to log plot status transitions
CREATE OR REPLACE FUNCTION public.log_plot_change() RETURNS TRIGGER AS $$
DECLARE
    act TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        act := 'created';
        INSERT INTO public.plot_history(plot_id, action, new_status, changed_by, details)
        VALUES (NEW.id, act, NEW.status, NEW.updated_by, jsonb_build_object('price', NEW.price, 'sale_price', NEW.sale_price));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status <> OLD.status THEN
            IF NEW.status = 'booked' THEN act := 'booked';
            ELSIF NEW.status = 'sold' THEN act := 'sold';
            ELSIF NEW.status = 'available' AND OLD.status IN ('booked','sold','reserved') THEN act := 'canceled';
            ELSE act := 'status_change';
            END IF;
            INSERT INTO public.plot_history(plot_id, action, old_status, new_status, changed_by, details)
            VALUES (NEW.id, act, OLD.status, NEW.status, NEW.updated_by, jsonb_build_object('price', NEW.price, 'sale_price', NEW.sale_price));
        ELSE
            INSERT INTO public.plot_history(plot_id, action, old_status, new_status, changed_by, details)
            VALUES (NEW.id, 'updated', OLD.status, NEW.status, NEW.updated_by, jsonb_build_object('changed_fields', (SELECT jsonb_object_agg(k,v) FROM jsonb_each(to_jsonb(NEW) - 'updated_at') AS e(k,v) WHERE to_jsonb(OLD)->k IS DISTINCT FROM v)) );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.plot_history(plot_id, action, old_status, changed_by, details)
        VALUES (OLD.id, 'deleted', OLD.status, OLD.updated_by, jsonb_build_object('price', OLD.price, 'sale_price', OLD.sale_price));
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plot_history_trigger_insert ON public.plots;
DROP TRIGGER IF EXISTS plot_history_trigger_update ON public.plots;
DROP TRIGGER IF EXISTS plot_history_trigger_delete ON public.plots;
CREATE TRIGGER plot_history_trigger_insert AFTER INSERT ON public.plots FOR EACH ROW EXECUTE PROCEDURE public.log_plot_change();
CREATE TRIGGER plot_history_trigger_update AFTER UPDATE ON public.plots FOR EACH ROW EXECUTE PROCEDURE public.log_plot_change();
CREATE TRIGGER plot_history_trigger_delete AFTER DELETE ON public.plots FOR EACH ROW EXECUTE PROCEDURE public.log_plot_change();

-- Trigger to log broker creation
CREATE OR REPLACE FUNCTION public.log_broker_creation() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'broker' THEN
        INSERT INTO public.broker_history(broker_id, action, actor_id, details)
        VALUES (NEW.id, 'created', NEW.id, jsonb_build_object('full_name', NEW.full_name));
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS broker_creation_history ON public.profiles;
CREATE TRIGGER broker_creation_history AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.log_broker_creation();

-- Update safe_delete_profile to log deletion
DROP FUNCTION IF EXISTS public.safe_delete_profile(UUID, UUID);
CREATE OR REPLACE FUNCTION public.safe_delete_profile(p_profile_id UUID, p_actor UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id AND deleted_at IS NOT NULL) THEN
        RETURN;
    END IF;
    UPDATE public.profiles SET sponsorid = NULL WHERE sponsorid = p_profile_id;
    UPDATE public.plots SET updated_by = NULL WHERE updated_by = p_profile_id;
    UPDATE public.plots SET created_by = NULL WHERE created_by = p_profile_id;
    UPDATE public.plots SET broker_id = NULL WHERE broker_id = p_profile_id;
    UPDATE public.payment_history SET updated_by = NULL WHERE updated_by = p_profile_id;
    UPDATE public.payment_history SET broker_id = NULL WHERE broker_id = p_profile_id;
    UPDATE public.profiles SET deleted_at = NOW(), updated_at = NOW() WHERE id = p_profile_id;
    INSERT INTO public.broker_history(broker_id, action, actor_id, details)
    VALUES (p_profile_id, 'soft_deleted', p_actor, jsonb_build_object('deleted_at', NOW()));
END; $$;

COMMIT;
