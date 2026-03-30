-- Add RLS policy for updating form_responses
CREATE POLICY "Allow users to update their own responses"
ON form_responses FOR UPDATE TO authenticated
USING (submitted_by = auth.uid())
WITH CHECK (submitted_by = auth.uid());

-- Add RLS policy for server-side updates (for payment processing)
CREATE POLICY "Allow server-side updates for payment processing"
ON form_responses FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

-- Add RLS policy for form owners to update responses
CREATE POLICY "Allow form owners to update responses"
ON form_responses FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.created_by = auth.uid()
  )
); 