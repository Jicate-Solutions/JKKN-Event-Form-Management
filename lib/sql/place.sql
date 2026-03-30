-- Create places table
CREATE TABLE IF NOT EXISTS public.places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(name)
);

-- Enable RLS
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Policies for places
CREATE POLICY "places_select_policy" 
ON public.places FOR SELECT 
USING (
  auth.role() = 'authenticated'
);

-- Only super_admin and administrator can manage places
CREATE POLICY "places_insert_update_policy" 
ON public.places FOR ALL 
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'administrator')
  )
);

-- Create updated trigger for timestamps
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.places
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp(); 