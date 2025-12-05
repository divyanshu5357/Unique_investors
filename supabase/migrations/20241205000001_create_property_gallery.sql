-- Create property_gallery table for managing property images
CREATE TABLE property_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    image_size INTEGER DEFAULT 0,
    image_type TEXT DEFAULT 'image/jpeg',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_property_gallery_project ON property_gallery(project_name);
CREATE INDEX idx_property_gallery_active ON property_gallery(is_active);
CREATE INDEX idx_property_gallery_order ON property_gallery(order_index);

-- Enable RLS
ALTER TABLE property_gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage gallery
CREATE POLICY "Admins can manage gallery"
ON property_gallery FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Public can view active gallery
CREATE POLICY "Public can view active gallery"
ON property_gallery FOR SELECT
USING (is_active = true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_property_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_gallery_updated_at_trigger
BEFORE UPDATE ON property_gallery
FOR EACH ROW
EXECUTE FUNCTION update_property_gallery_updated_at();
