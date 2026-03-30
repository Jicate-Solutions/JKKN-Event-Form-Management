-- Migration: Add Auto-Fetch Fallback Configuration
-- Description: Adds configuration fields for handling users not found in MYJKKN

-- Add new configuration columns to personal_forms
ALTER TABLE personal_forms
ADD COLUMN IF NOT EXISTS require_institutional_profile BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_manual_entry_fallback BOOLEAN DEFAULT FALSE;

-- Create index for forms with strict profile requirements
CREATE INDEX IF NOT EXISTS idx_personal_forms_require_profile
ON personal_forms(require_institutional_profile)
WHERE require_institutional_profile = TRUE;

-- Comments for documentation
COMMENT ON COLUMN personal_forms.require_institutional_profile IS 'If true, block submissions from users not found in MYJKKN database';
COMMENT ON COLUMN personal_forms.allow_manual_entry_fallback IS 'If true and user not found, show manual entry form instead of blocking';
