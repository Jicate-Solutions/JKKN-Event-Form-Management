-- This file contains SQL commands to set up storage buckets and RLS policies for the JKKN Event Form Management system

-- Create form-uploads bucket (for form submission files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create form-banners bucket (for form banners and field images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-banners', 'form-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket (for user profile images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create institution-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('institution-logos', 'institution-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ==================== RLS POLICIES FOR FORM-UPLOADS BUCKET ====================

-- Allow authenticated users to upload files to form-uploads
CREATE POLICY "Allow authenticated uploads to form-uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'form-uploads' AND
  (auth.role() = 'authenticated')
);

-- Allow users to read their own uploads from form-uploads
CREATE POLICY "Allow users to read own uploads from form-uploads" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'form-uploads' AND
  (auth.uid() = (storage.foldername(name))[4]::uuid)
);

-- Allow form owners to read all uploads for their forms from form-uploads
CREATE POLICY "Allow form owners to read form uploads from form-uploads" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'form-uploads' AND
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = (storage.foldername(name))[2]::uuid
    AND forms.created_by = auth.uid()
  )
);

-- ==================== RLS POLICIES FOR FORM-BANNERS BUCKET ====================

-- Allow authenticated users to upload to form-banners bucket
CREATE POLICY "Allow authenticated uploads to form-banners" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'form-banners' AND
  auth.role() = 'authenticated'
);

-- Allow public access to read from form-banners bucket (for displaying banners and field images)
CREATE POLICY "Allow public read access to form-banners" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'form-banners'
);

-- Allow users to update their own uploads in form-banners
CREATE POLICY "Allow users to update own uploads in form-banners" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'form-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'form-banners'
);

-- Allow users to delete their own uploads from form-banners
CREATE POLICY "Allow users to delete own uploads from form-banners" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'form-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ==================== RLS POLICIES FOR AVATARS BUCKET ====================

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Allow authenticated uploads to avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to read from avatars bucket
CREATE POLICY "Allow public read access to avatars" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'avatars'
);

-- Allow users to update their own avatars
CREATE POLICY "Allow users to update own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
);

-- Allow users to delete their own avatars
CREATE POLICY "Allow users to delete own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ==================== RLS POLICIES FOR INSTITUTION-LOGOS BUCKET ====================

-- Allow authenticated users to upload to institution-logos bucket
CREATE POLICY "Allow authenticated uploads to institution-logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'institution-logos' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id::text = (storage.foldername(name))[1]
    AND (
      institutions.admin_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM institution_members
        WHERE institution_members.institution_id = institutions.id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('admin', 'editor')
      )
    )
  )
);

-- Allow public access to read from institution-logos bucket
CREATE POLICY "Allow public read access to institution-logos" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'institution-logos'
);

-- Allow institution admins and editors to update logos
CREATE POLICY "Allow institution admins to update logos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'institution-logos' AND
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id::text = (storage.foldername(name))[1]
    AND (
      institutions.admin_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM institution_members
        WHERE institution_members.institution_id = institutions.id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('admin', 'editor')
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'institution-logos'
);

-- Allow institution admins and editors to delete logos
CREATE POLICY "Allow institution admins to delete logos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'institution-logos' AND
  EXISTS (
    SELECT 1 FROM institutions
    WHERE institutions.id::text = (storage.foldername(name))[1]
    AND (
      institutions.admin_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM institution_members
        WHERE institution_members.institution_id = institutions.id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('admin', 'editor')
      )
    )
  )
);
