-- Create trigger function for timestamps
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create enum for form status
CREATE TYPE form_status AS ENUM ('draft', 'published', 'archived');

-- Create forms table
CREATE TABLE forms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'draft',
    institution_id UUID NOT NULL REFERENCES institutions(id),
    event_id UUID REFERENCES events(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    banner_url TEXT
);

-- Add foreign key constraints if they don't exist
ALTER TABLE forms 
  ADD CONSTRAINT forms_institution_id_fkey 
  FOREIGN KEY (institution_id) 
  REFERENCES institutions(id) 
  ON DELETE CASCADE;

ALTER TABLE forms 
  ADD CONSTRAINT forms_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE forms 
  ADD CONSTRAINT forms_event_id_fkey 
  FOREIGN KEY (event_id) 
  REFERENCES events(id) 
  ON DELETE SET NULL;

-- Add index for event_id in forms table
CREATE INDEX IF NOT EXISTS idx_forms_event_id ON forms(event_id);

-- First drop and recreate the form_responses table
DROP TABLE IF EXISTS form_responses;

CREATE TABLE form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    response_data JSONB NOT NULL DEFAULT '{}',
    submitted_by UUID REFERENCES auth.users(id),
    is_anonymous BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    user_email TEXT
);

-- Create form templates table
CREATE TABLE form_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]',
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    banner_url TEXT
);

-- Add RLS policies
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Forms are viewable by authenticated users" ON forms;

-- Create new RLS policies for forms
CREATE POLICY "Forms are viewable by authenticated users" ON forms
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    -- Super admin and administrator can view all forms
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
    -- Allow users to view their own forms
    OR created_by = auth.uid()
    -- Allow institution coordinators to view their institution's forms
    OR EXISTS (
      SELECT 1 FROM institution_coordinators
      WHERE institution_id = forms.institution_id
      AND user_id = auth.uid()
    )
    -- Allow public forms to be viewed by anyone
    OR is_public = true
  )
);

-- Keep other policies unchanged
CREATE POLICY "Forms are insertable by authenticated users"
    ON forms FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Forms are updatable by creator and admins"
    ON forms FOR UPDATE
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'administrator')
        )
    );

CREATE POLICY "Forms are deletable by creator and admins"
    ON forms FOR DELETE
    USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'administrator')
        )
    );

-- Form responses policies
CREATE POLICY "Responses are viewable by form creator and institution members"
    ON form_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM forms f
            WHERE f.id = form_responses.form_id
            AND (
                f.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM institution_coordinators ic
                    WHERE ic.institution_id = f.institution_id
                    AND ic.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Responses are insertable by authenticated users"
    ON form_responses FOR INSERT
    WITH CHECK (auth.uid() = submitted_by);

-- Form templates policies
CREATE POLICY "Templates are viewable by all authenticated users"
    ON form_templates FOR SELECT
    USING (is_public OR auth.uid() = created_by);

CREATE POLICY "Templates are insertable by authenticated users"
    ON form_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Templates are updatable by creator"
    ON form_templates FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Templates are deletable by creator"
    ON form_templates FOR DELETE
    USING (auth.uid() = created_by);

-- Create updated_at triggers
CREATE TRIGGER set_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_form_templates_updated_at
    BEFORE UPDATE ON form_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Add RLS policies for form_responses table
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow anonymous submissions to public forms"
ON form_responses FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.is_public = true
  )
);

CREATE POLICY "Allow authenticated users to submit responses"
ON form_responses FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy to allow users to read their own responses
CREATE POLICY "Users can read own responses"
ON form_responses FOR SELECT TO authenticated
USING (submitted_by = auth.uid());

-- Policy to allow form owners to read all responses
CREATE POLICY "Form owners can read all responses"
ON form_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.created_by = auth.uid()
  )
);

-- Drop the unique index that prevents multiple submissions
DROP INDEX IF EXISTS idx_form_responses_unique_submission;

-- Make sure the submission_id column exists and is unique (if you want each submission to have a unique ID)
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS submission_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_responses_unique_submission_id ON form_responses(submission_id) 
WHERE submission_id IS NOT NULL;

-- Add RLS policies for form_templates table
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create templates
CREATE POLICY "Enable insert for authenticated users" ON form_templates
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view templates
CREATE POLICY "Enable read access for authenticated users" ON form_templates
  FOR SELECT 
  TO authenticated
  USING (true);

-- Allow template owners to update their templates
CREATE POLICY "Enable update for users based on user_id" ON form_templates
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Allow template owners to delete their templates
CREATE POLICY "Enable delete for users based on user_id" ON form_templates
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy to allow event coordinators to read responses for their events
CREATE POLICY "Event coordinators can read event form responses"
ON form_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms f
    JOIN events e ON f.event_id = e.id
    WHERE f.id = form_responses.form_id
    AND e.coordinator_id = auth.uid()
  )
); 