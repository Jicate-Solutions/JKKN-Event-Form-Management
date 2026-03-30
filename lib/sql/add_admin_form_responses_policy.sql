-- Add RLS policy for super admins and administrators to view all form responses
CREATE POLICY "Super admins and administrators can view all responses"
ON form_responses FOR SELECT TO authenticated
USING (
  -- Check if the current user is a super_admin or administrator
  -- using the auth.jwt() function which is accessible in RLS policies
  auth.jwt()->>'role' = 'authenticated' AND (
    -- Check if the user is in the profiles table with admin role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
);
