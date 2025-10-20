-- Add missing fields to plots table to match the application schema
ALTER TABLE plots ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS block TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS dimension TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS broker_name TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES profiles(id);
ALTER TABLE plots ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS sold_amount DECIMAL(12,2);
ALTER TABLE plots ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2);

-- Update status enum to match application
ALTER TABLE plots DROP CONSTRAINT IF EXISTS plots_status_check;
ALTER TABLE plots ADD CONSTRAINT plots_status_check CHECK (status IN ('available', 'booked', 'sold'));

-- Update plot number to be an integer field for proper sorting
ALTER TABLE plots ALTER COLUMN plot_number TYPE INTEGER USING plot_number::INTEGER;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_plots_broker_id ON plots(broker_id);
CREATE INDEX IF NOT EXISTS idx_plots_type ON plots(type);
CREATE INDEX IF NOT EXISTS idx_plots_block ON plots(block);

-- Update testimonials table to match application schema
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS company TEXT;