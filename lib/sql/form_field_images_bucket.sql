-- Create form-field-images bucket for storing form field images
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-field-images', 'form-field-images', true)
ON CONFLICT (id) DO NOTHING;

-- ==================== RLS POLICIES FOR FORM-FIELD-IMAGES BUCKET ====================

-- Allow authenticated users to upload to form-field-images bucket
CREATE POLICY "Allow authenticated uploads to form-field-images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'form-field-images' AND
  auth.role() = 'authenticated'
);

-- Allow public access to read from form-field-images bucket
CREATE POLICY "Allow public read access to form-field-images" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'form-field-images'
);

-- Allow form creators to update their form field images
CREATE POLICY "Allow form creators to update form field images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'form-field-images' AND
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id::text = (storage.foldername(name))[1]
    AND forms.created_by = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'form-field-images'
);

-- Allow form creators to delete their form field images
CREATE POLICY "Allow form creators to delete form field images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'form-field-images' AND
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id::text = (storage.foldername(name))[1]
    AND forms.created_by = auth.uid()
  )
);
