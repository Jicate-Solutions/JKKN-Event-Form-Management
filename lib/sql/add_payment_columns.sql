-- Add payment-related columns to form_responses table
ALTER TABLE form_responses 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index on payment_status for faster queries
CREATE INDEX IF NOT EXISTS idx_form_responses_payment_status ON form_responses(payment_status);

-- Create index on payment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_responses_payment_id ON form_responses(payment_id); 