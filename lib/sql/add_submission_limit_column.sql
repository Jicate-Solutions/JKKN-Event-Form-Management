-- Add submission_limit column to forms table
-- This column will allow forms to have a maximum number of submissions

ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS submission_limit INTEGER;

-- Add a comment to explain the column
COMMENT ON COLUMN forms.submission_limit IS 'Optional maximum number of submissions allowed for this form. NULL means unlimited submissions.';

-- Add a check constraint to ensure submission_limit is positive when set
ALTER TABLE forms 
ADD CONSTRAINT forms_submission_limit_positive 
CHECK (submission_limit IS NULL OR submission_limit > 0);

-- Create index for faster queries when checking submission limits
CREATE INDEX IF NOT EXISTS idx_forms_submission_limit ON forms(submission_limit) 
WHERE submission_limit IS NOT NULL; 