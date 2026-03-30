-- Fix Department Coordinator Permissions for Form Responses and Forms
-- This migration adds missing RLS policies to allow department coordinators proper access

-- 1. Add RLS policy for department coordinators to access form responses for their department's events
CREATE POLICY "Department coordinators can read department event form responses"
ON form_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms f
    JOIN events e ON f.event_id = e.id
    JOIN department_coordinators dc ON dc.department_id = e.department_id
    WHERE f.id = form_responses.form_id
    AND dc.user_id = auth.uid()
  )
);

-- 2. Add RLS policy for department coordinators to access all events in their institution
-- This allows department coordinators to see form responses for any event in their institution
-- even if the event is not assigned to their specific department
CREATE POLICY "Department coordinators can read institution event form responses"
ON form_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms f
    JOIN events e ON f.event_id = e.id
    JOIN departments d ON d.institution_id = e.institution_id
    JOIN department_coordinators dc ON dc.department_id = d.id
    WHERE f.id = form_responses.form_id
    AND dc.user_id = auth.uid()
  )
);

-- 3. Add RLS policy for department coordinators to update form responses
CREATE POLICY "Department coordinators can update department event form responses"
ON form_responses FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms f
    JOIN events e ON f.event_id = e.id
    JOIN department_coordinators dc ON dc.department_id = e.department_id
    WHERE f.id = form_responses.form_id
    AND dc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM forms f
    JOIN events e ON f.event_id = e.id
    JOIN department_coordinators dc ON dc.department_id = e.department_id
    WHERE f.id = form_responses.form_id
    AND dc.user_id = auth.uid()
  )
);

-- 4. Add RLS policy for department coordinators to delete form responses
CREATE POLICY "Department coordinators can delete department event form responses"
ON form_responses FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM forms f
    JOIN events e ON f.event_id = e.id
    JOIN department_coordinators dc ON dc.department_id = e.department_id
    WHERE f.id = form_responses.form_id
    AND dc.user_id = auth.uid()
  )
);

-- 5. Update the existing forms policy to include department coordinators
-- First, we need to drop the existing policy and recreate it with department coordinator access
DROP POLICY IF EXISTS "Forms are viewable by authenticated users" ON forms;

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
    -- Allow department coordinators to view forms for events in their department
    OR EXISTS (
      SELECT 1 FROM department_coordinators dc
      JOIN events e ON e.department_id = dc.department_id
      WHERE forms.event_id = e.id
      AND dc.user_id = auth.uid()
    )
    -- Allow department coordinators to view forms for any event in their institution
    OR EXISTS (
      SELECT 1 FROM department_coordinators dc
      JOIN departments d ON d.id = dc.department_id
      JOIN events e ON e.institution_id = d.institution_id
      WHERE forms.event_id = e.id
      AND dc.user_id = auth.uid()
    )
    -- Allow public forms to be viewed by anyone
    OR is_public = true
  )
);

-- 6. Add RLS policy for department coordinators to update forms
CREATE POLICY "Department coordinators can update department event forms"
ON forms FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM department_coordinators dc
    JOIN events e ON e.department_id = dc.department_id
    WHERE forms.event_id = e.id
    AND dc.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM department_coordinators dc
    JOIN departments d ON d.id = dc.department_id
    JOIN events e ON e.institution_id = d.institution_id
    WHERE forms.event_id = e.id
    AND dc.user_id = auth.uid()
  )
);

-- 7. Add RLS policy for department coordinators to delete forms
CREATE POLICY "Department coordinators can delete department event forms"
ON forms FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM department_coordinators dc
    JOIN events e ON e.department_id = dc.department_id
    WHERE forms.event_id = e.id
    AND dc.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM department_coordinators dc
    JOIN departments d ON d.id = dc.department_id
    JOIN events e ON e.institution_id = d.institution_id
    WHERE forms.event_id = e.id
    AND dc.user_id = auth.uid()
  )
);

-- 8. Add policy for department coordinators to insert forms
CREATE POLICY "Department coordinators can create forms for their events"
ON forms FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM department_coordinators dc
    JOIN events e ON e.department_id = dc.department_id
    WHERE forms.event_id = e.id
    AND dc.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM department_coordinators dc
    JOIN departments d ON d.id = dc.department_id
    JOIN events e ON e.institution_id = d.institution_id
    WHERE forms.event_id = e.id
    AND dc.user_id = auth.uid()
  )
  OR
  -- Keep existing creator check
  auth.uid() = created_by
);