-- Add RLS policy for deleting form_responses
CREATE POLICY "Allow form owners to delete responses"
ON form_responses FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.created_by = auth.uid()
  )
);

-- Add RLS policy for admins to delete responses
CREATE POLICY "Allow admins to delete form responses" 
ON form_responses FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'administrator')
  )
); 