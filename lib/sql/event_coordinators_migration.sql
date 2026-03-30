-- ================================================
-- Event Coordinators Migration
-- Purpose: Implement event-level ownership and coordinator assignment
-- Date: 2025-01-18
-- ================================================

-- 1. Create event_coordinators table
-- ================================================
CREATE TABLE IF NOT EXISTS public.event_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'coordinator',
  -- Roles: 'owner' (full control), 'coordinator' (can manage), 'viewer' (read-only)
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  CONSTRAINT event_coordinators_unique_user_event UNIQUE(event_id, user_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_coordinators_event_id
  ON public.event_coordinators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_coordinators_user_id
  ON public.event_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_event_coordinators_role
  ON public.event_coordinators(role);

-- Add comments for documentation
COMMENT ON TABLE public.event_coordinators IS 'Many-to-many relationship for event ownership and coordinator assignment';
COMMENT ON COLUMN public.event_coordinators.role IS 'owner: full control, coordinator: can manage, viewer: read-only';
COMMENT ON COLUMN public.event_coordinators.assigned_by IS 'User who assigned this coordinator';

-- ================================================
-- 2. Enable Row Level Security (RLS)
-- ================================================
ALTER TABLE public.event_coordinators ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can see coordinator assignments
CREATE POLICY "event_coordinators_select_policy"
ON public.event_coordinators FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only event owners, institution coordinators, and admins can assign coordinators
CREATE POLICY "event_coordinators_insert_policy"
ON public.event_coordinators FOR INSERT
TO authenticated
WITH CHECK (
  -- Event owner can assign
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = event_coordinators.event_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  -- Institution coordinator can assign
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.institution_coordinators ic ON ic.institution_id = e.institution_id
    WHERE e.id = event_coordinators.event_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Super admin and administrator can assign
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- UPDATE: Only event owners, institution coordinators, and admins can update
CREATE POLICY "event_coordinators_update_policy"
ON public.event_coordinators FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = event_coordinators.event_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.institution_coordinators ic ON ic.institution_id = e.institution_id
    WHERE e.id = event_coordinators.event_id
    AND ic.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- DELETE: Only event owners, institution coordinators, and admins can remove coordinators
-- BUT: Cannot delete the owner role
CREATE POLICY "event_coordinators_delete_policy"
ON public.event_coordinators FOR DELETE
TO authenticated
USING (
  role != 'owner' AND (
    EXISTS (
      SELECT 1 FROM public.event_coordinators ec
      WHERE ec.event_id = event_coordinators.event_id
      AND ec.user_id = auth.uid()
      AND ec.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.institution_coordinators ic ON ic.institution_id = e.institution_id
      WHERE e.id = event_coordinators.event_id
      AND ic.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'administrator')
    )
  )
);

-- ================================================
-- 3. Create form_collaborators table
-- ================================================
CREATE TABLE IF NOT EXISTS public.form_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view',
  -- Permissions: 'view' (read-only), 'edit' (modify form), 'manage_responses' (view/export responses)
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  CONSTRAINT form_collaborators_unique_user_form UNIQUE(form_id, user_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_form_collaborators_form_id
  ON public.form_collaborators(form_id);
CREATE INDEX IF NOT EXISTS idx_form_collaborators_user_id
  ON public.form_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_form_collaborators_permission
  ON public.form_collaborators(permission_level);

-- Add comments for documentation
COMMENT ON TABLE public.form_collaborators IS 'Granular form access control with permission levels';
COMMENT ON COLUMN public.form_collaborators.permission_level IS 'view: read-only, edit: modify form, manage_responses: view/export responses';
COMMENT ON COLUMN public.form_collaborators.assigned_by IS 'User who assigned this collaborator';

-- ================================================
-- 4. Enable Row Level Security (RLS) for form_collaborators
-- ================================================
ALTER TABLE public.form_collaborators ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can see collaborator assignments
CREATE POLICY "form_collaborators_select_policy"
ON public.form_collaborators FOR SELECT
TO authenticated
USING (true);

-- INSERT: Form creator, event owners, and admins can assign collaborators
CREATE POLICY "form_collaborators_insert_policy"
ON public.form_collaborators FOR INSERT
TO authenticated
WITH CHECK (
  -- Form creator can assign
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_collaborators.form_id
    AND created_by = auth.uid()
  )
  OR
  -- Event owner can assign
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_collaborators.form_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  -- Institution coordinator can assign
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.institution_coordinators ic ON ic.institution_id = f.institution_id
    WHERE f.id = form_collaborators.form_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Super admin and administrator can assign
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- UPDATE: Same as INSERT
CREATE POLICY "form_collaborators_update_policy"
ON public.form_collaborators FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_collaborators.form_id
    AND created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_collaborators.form_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.institution_coordinators ic ON ic.institution_id = f.institution_id
    WHERE f.id = form_collaborators.form_id
    AND ic.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- DELETE: Same as INSERT
CREATE POLICY "form_collaborators_delete_policy"
ON public.form_collaborators FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_collaborators.form_id
    AND created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_collaborators.form_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.institution_coordinators ic ON ic.institution_id = f.institution_id
    WHERE f.id = form_collaborators.form_id
    AND ic.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
);

-- ================================================
-- 5. Update existing Events RLS policies
-- ================================================

-- Drop old events policies
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;

-- New SELECT: View if owner, coordinator, institution coordinator, or admin
CREATE POLICY "events_select_policy_v2"
ON public.events FOR SELECT
TO authenticated
USING (
  -- Super admin and administrator can view all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator can view institution events
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = events.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Event owner or assigned coordinator can view
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = events.id
    AND ec.user_id = auth.uid()
  )
);

-- New UPDATE: Only owner, institution coordinator, or admin
CREATE POLICY "events_update_policy_v2"
ON public.events FOR UPDATE
TO authenticated
USING (
  -- Super admin and administrator can update all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator can update institution events
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = events.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Event owner can update (not just any coordinator)
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = events.id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
);

-- ================================================
-- 6. Update existing Forms RLS policies
-- ================================================

-- Drop old forms policies
DROP POLICY IF EXISTS "Forms are viewable by authenticated users" ON public.forms;
DROP POLICY IF EXISTS "Forms are updatable by creator and admins" ON public.forms;

-- New SELECT: View if creator, event coordinator, form collaborator, institution coordinator, or admin
CREATE POLICY "forms_select_policy_v2"
ON public.forms FOR SELECT
TO authenticated
USING (
  -- Super admin and administrator can view all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator can view institution forms
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = forms.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Form creator can view
  created_by = auth.uid()
  OR
  -- Event coordinator can view
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = forms.event_id
    AND ec.user_id = auth.uid()
  )
  OR
  -- Form collaborator can view
  EXISTS (
    SELECT 1 FROM public.form_collaborators fc
    WHERE fc.form_id = forms.id
    AND fc.user_id = auth.uid()
  )
  OR
  -- Public forms
  is_public = true
);

-- New UPDATE: Only creator, event owner, form collaborators with edit, institution coordinator, or admin
CREATE POLICY "forms_update_policy_v2"
ON public.forms FOR UPDATE
TO authenticated
USING (
  -- Super admin and administrator can update all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator can update institution forms
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.institution_id = forms.institution_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Form creator can update
  created_by = auth.uid()
  OR
  -- Event owner can update
  EXISTS (
    SELECT 1 FROM public.event_coordinators ec
    WHERE ec.event_id = forms.event_id
    AND ec.user_id = auth.uid()
    AND ec.role = 'owner'
  )
  OR
  -- Form collaborator with edit or manage_responses permission can update
  EXISTS (
    SELECT 1 FROM public.form_collaborators fc
    WHERE fc.form_id = forms.id
    AND fc.user_id = auth.uid()
    AND fc.permission_level IN ('edit', 'manage_responses')
  )
);

-- ================================================
-- 7. Update existing Form Responses RLS policies
-- ================================================

-- Drop old form_responses policies
DROP POLICY IF EXISTS "Responses are viewable by form creator and institution members" ON public.form_responses;

-- New SELECT: View if creator, event coordinator, form collaborator, institution coordinator, or admin
CREATE POLICY "form_responses_select_policy_v2"
ON public.form_responses FOR SELECT
TO authenticated
USING (
  -- Super admin and administrator can view all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
  )
  OR
  -- Institution coordinator can view institution responses
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.institution_coordinators ic ON ic.institution_id = f.institution_id
    WHERE f.id = form_responses.form_id
    AND ic.user_id = auth.uid()
  )
  OR
  -- Form creator can view
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = form_responses.form_id
    AND created_by = auth.uid()
  )
  OR
  -- Event coordinator can view
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.event_coordinators ec ON ec.event_id = f.event_id
    WHERE f.id = form_responses.form_id
    AND ec.user_id = auth.uid()
  )
  OR
  -- Form collaborator can view
  EXISTS (
    SELECT 1 FROM public.form_collaborators fc
    WHERE fc.form_id = form_responses.form_id
    AND fc.user_id = auth.uid()
  )
);

-- ================================================
-- 8. Create trigger to auto-create owner record when event is created
-- ================================================
CREATE OR REPLACE FUNCTION create_event_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically create owner record in event_coordinators
  INSERT INTO public.event_coordinators (event_id, user_id, role, assigned_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_event_owner ON public.events;
CREATE TRIGGER trigger_create_event_owner
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION create_event_owner();

-- ================================================
-- 9. Migrate existing events to have owner records
-- ================================================
-- For all existing events, create owner records
INSERT INTO public.event_coordinators (event_id, user_id, role, assigned_by)
SELECT
  id as event_id,
  created_by as user_id,
  'owner' as role,
  created_by as assigned_by
FROM public.events
WHERE created_by IS NOT NULL
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ================================================
-- 10. Add helpful indexes to existing tables
-- ================================================
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_event_id ON public.forms(event_id);
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON public.forms(created_by);

-- ================================================
-- Migration Complete
-- ================================================
-- Summary:
-- ✓ Created event_coordinators table with RLS
-- ✓ Created form_collaborators table with RLS
-- ✓ Updated events RLS policies for new access model
-- ✓ Updated forms RLS policies for collaborator access
-- ✓ Updated form_responses RLS policies
-- ✓ Added trigger to auto-create event owners
-- ✓ Migrated existing events to have owner records
-- ✓ Added performance indexes
-- ================================================
