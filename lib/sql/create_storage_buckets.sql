-- Create form uploads bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true);

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'form-uploads' AND
  (auth.role() = 'authenticated')
);

-- Allow users to read their own uploads
CREATE POLICY "Allow users to read own uploads" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'form-uploads' AND
  (auth.uid() = (storage.foldername(name))[4]::uuid)
);

-- Allow form owners to read all uploads for their forms
CREATE POLICY "Allow form owners to read form uploads" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'form-uploads' AND
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = (storage.foldername(name))[2]::uuid
    AND forms.created_by = auth.uid()
  )
); 