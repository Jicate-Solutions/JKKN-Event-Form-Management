-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Now recreate everything cleanly
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'administrator',
  'institution_coordinator',
  'event_coordinator',
  'staff',
  'student',
  'public'
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Temporarily disable RLS to allow initial setup
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create a profile if one doesn't exist and it's not being created by our API
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) AND 
     NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      phone_number,
      is_active,
      profile_complete
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'role', 'public')::user_role,
      NEW.raw_user_meta_data->>'phone_number',
      true,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;

-- Create simplified policies using session metadata
CREATE POLICY "profiles_read_policy"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Allow users to read their own profile
  auth.uid() = id OR
  -- Allow service role full access
  auth.jwt() ->> 'role' = 'service_role' OR
  -- Allow admins to read all profiles
  (auth.jwt() ->> 'role' IN ('super_admin', 'administrator'))
);

CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Only service role and admins can insert
  auth.jwt() ->> 'role' = 'service_role' OR
  (auth.jwt() ->> 'role' IN ('super_admin', 'administrator'))
);

CREATE POLICY "profiles_update_allowed" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'administrator')
    )
  );

CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
TO authenticated
USING (
  -- Only service role and super admins can delete
  auth.jwt() ->> 'role' = 'service_role' OR
  auth.jwt() ->> 'role' = 'super_admin'
);

-- Grant necessary permissions
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Remove any existing policies
DROP POLICY IF EXISTS "Avatar storage access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated avatar uploads" ON storage.objects;

-- Policy for authenticated users to manage their avatars
CREATE POLICY "Avatar storage access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Policy for public access to avatars
CREATE POLICY "Avatar public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy for authenticated users to upload avatars
CREATE POLICY "Allow authenticated avatar uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = 'avatars'
);

-- Enable read access for all authenticated users
CREATE POLICY "Enable read access for authenticated users"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Drop existing update policies
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for service_role and users own rows" ON public.profiles;

-- Create a single comprehensive update policy
CREATE OR REPLACE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id OR
  auth.jwt() ->> 'role' = 'service_role' OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN (
    'super_admin',
    'administrator',
    'institution_coordinator'
  )
);

-- Create institution coordinators table
CREATE TABLE IF NOT EXISTS public.institution_coordinators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  institution_id UUID NOT NULL, -- Will reference institutions table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, institution_id)
);

-- Enable RLS on institution_coordinators
ALTER TABLE public.institution_coordinators ENABLE ROW LEVEL SECURITY;

-- Policy for institution_coordinators
CREATE POLICY "institution_coordinators_access"
ON public.institution_coordinators
FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN (
    'super_admin',
    'administrator'
  )
);