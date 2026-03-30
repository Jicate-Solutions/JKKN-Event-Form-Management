-- Create events table with proper foreign key relationships
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_events_place_id ON public.events(place_id);
CREATE INDEX IF NOT EXISTS idx_events_institution_id ON public.events(institution_id);
CREATE INDEX IF NOT EXISTS idx_events_department_id ON public.events(department_id);
CREATE INDEX IF NOT EXISTS idx_events_coordinator_id ON public.events(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "events_select_policy" 
ON public.events FOR SELECT 
USING (
  -- Allow all authenticated users to view events
  auth.role() = 'authenticated' OR
  
  -- Check for department coordinators 
  (
    events.department_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM department_coordinators 
      WHERE department_coordinators.user_id = auth.uid() 
      AND department_coordinators.department_id = events.department_id
    )
  ) OR
  
  -- Check for institution coordinators
  (
    events.institution_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM institution_coordinators 
      WHERE institution_coordinators.user_id = auth.uid() 
      AND institution_coordinators.institution_id = events.institution_id
    )
  )
);

CREATE POLICY "events_insert_policy" 
ON public.events FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'administrator', 'institution_coordinator', 'event_coordinator')
        )
    )
); 

CREATE POLICY "events_update_policy" 
ON public.events 
FOR UPDATE
USING (
  -- Allow event creator to update
  auth.uid() = created_by 
  OR 
  -- Allow assigned event coordinator to update
  auth.uid() = coordinator_id
  OR
  -- Allow department coordinators to update events for their department
  (
    events.department_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM department_coordinators 
      WHERE department_coordinators.user_id = auth.uid() 
      AND department_coordinators.department_id = events.department_id
    )
  )
  OR
  -- Allow institution coordinators to update events for their institution
  (
    events.institution_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM institution_coordinators 
      WHERE institution_coordinators.user_id = auth.uid() 
      AND institution_coordinators.institution_id = events.institution_id
    )
  )
  OR
  -- Allow admins to update
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator')
  )
);

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS has_registration_form BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming';