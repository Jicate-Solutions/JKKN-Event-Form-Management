-- Create trigger function for timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- First drop existing constraints if any
ALTER TABLE IF EXISTS public.departments 
DROP CONSTRAINT IF EXISTS departments_coordinator_id_fkey;

-- Department table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  coordinator_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(institution_id, name)
);

-- Add explicit foreign key to profiles
ALTER TABLE public.departments 
ADD CONSTRAINT departments_coordinator_id_fkey 
FOREIGN KEY (coordinator_id) 
REFERENCES public.profiles(id);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policies for departments
CREATE POLICY "departments_select_policy" 
ON public.departments FOR SELECT 
USING (
  auth.role() = 'authenticated' AND (
    -- Super admins and administrators can view all
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'administrator')
    ) OR
    -- Institution coordinators can view their institutions
    EXISTS (
      SELECT 1 FROM public.institution_coordinators 
      WHERE user_id = auth.uid() 
      AND institution_id = departments.institution_id
    )
  )
);

-- Insert/Update policy
CREATE POLICY "departments_insert_update_policy" 
ON public.departments FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'administrator')
    ) OR
    EXISTS (
      SELECT 1 FROM public.institution_coordinators 
      WHERE user_id = auth.uid() 
      AND institution_id = departments.institution_id
    )
  )
);

-- Create updated trigger for timestamps
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE POLICY "departments_delete_policy" 
ON public.departments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator')
  ) OR
  EXISTS (
    SELECT 1 FROM public.institution_coordinators ic
    WHERE ic.user_id = auth.uid()
    AND ic.institution_id = institution_id
  )
);

-- Add trigger to update coordinator_id in departments table
CREATE OR REPLACE FUNCTION sync_department_coordinator()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE departments 
    SET coordinator_id = NEW.user_id
    WHERE id = NEW.department_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE departments 
    SET coordinator_id = NULL
    WHERE id = OLD.department_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_department_coordinator_trigger
AFTER INSERT OR DELETE ON department_coordinators
FOR EACH ROW
EXECUTE FUNCTION sync_department_coordinator();