-- Add slug column to forms table
-- This column will store SEO-friendly URLs for forms

ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Add a comment to explain the column
COMMENT ON COLUMN forms.slug IS 'SEO-friendly URL slug generated from form title. NULL for existing forms using UUID routing.';

-- Create unique index for slug (excluding NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_forms_slug_unique ON forms(slug) 
WHERE slug IS NOT NULL;

-- Create index for faster queries when looking up forms by slug
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug) 
WHERE slug IS NOT NULL; 