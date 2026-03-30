-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create institutions table
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    coordinator_id UUID REFERENCES auth.users(id)
    
);

-- Add indexes for better query performance
CREATE INDEX idx_institutions_is_active ON public.institutions(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.institutions;
DROP POLICY IF EXISTS "Enable insert for authenticated admin users" ON public.institutions;
DROP POLICY IF EXISTS "Enable update for authenticated admin users" ON public.institutions;
DROP POLICY IF EXISTS "Enable delete for authenticated admin users" ON public.institutions;

-- Create a function to check admin status for institutions
CREATE OR REPLACE FUNCTION is_institution_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND (
                raw_user_meta_data->>'role' IN ('super_admin', 'administrator')
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('super_admin', 'administrator')
                )
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for institutions table
CREATE POLICY "Enable read access for authenticated users"
    ON public.institutions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.institutions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated admin users"
    ON public.institutions
    FOR UPDATE
    TO authenticated
    USING (is_institution_admin());

CREATE POLICY "Enable delete for authenticated admin users"
    ON public.institutions
    FOR DELETE
    TO authenticated
    USING (is_institution_admin());

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_institutions_updated_at
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Institution coordinators table
CREATE TABLE IF NOT EXISTS public.institution_coordinators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, institution_id)
);

-- Drop and recreate department_coordinators table with correct references
DROP TABLE IF EXISTS public.department_coordinators;

CREATE TABLE public.department_coordinators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Changed to reference profiles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(department_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_department_coordinators_department_id ON public.department_coordinators(department_id);
CREATE INDEX IF NOT EXISTS idx_department_coordinators_coordinator_id ON public.department_coordinators(user_id);

-- Enable RLS
ALTER TABLE public.institution_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_coordinators ENABLE ROW LEVEL SECURITY;

-- Policies for institution_coordinators
CREATE POLICY "institution_coordinators_select_policy" 
ON public.institution_coordinators FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "institution_coordinators_insert_policy" 
ON public.institution_coordinators FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator')
  )
);

-- Add update policy for institution_coordinators
CREATE POLICY "institution_coordinators_update_policy" 
ON public.institution_coordinators FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator')
  )
);

-- Add delete policy for institution_coordinators
CREATE POLICY "institution_coordinators_delete_policy" 
ON public.institution_coordinators FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator')
  )
);

-- Policies for department_coordinators
CREATE POLICY "department_coordinators_select_policy" 
ON public.department_coordinators FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "department_coordinators_insert_policy" 
ON public.department_coordinators FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator', 'institution_coordinator')
  )
);

-- Add trigger for updating timestamps
CREATE TRIGGER update_institution_coordinators_updated_at
    BEFORE UPDATE ON public.institution_coordinators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Remove coordinator_id column from departments table if it exists
ALTER TABLE IF EXISTS public.departments 
DROP COLUMN IF EXISTS coordinator_id;



