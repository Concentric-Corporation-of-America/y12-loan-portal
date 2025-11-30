-- Storage Bucket RLS Policies for Federal Credit Union Compliance
-- Ensures only authenticated users can access their own files
-- Applied: November 30, 2025

-- Policy for member-photos bucket: Users can only access their own photos
CREATE POLICY "Users can view their own member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own member photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'member-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for loan-documents bucket: Users can only access their own loan documents
CREATE POLICY "Users can view their own loan documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own loan documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin policies: Admins can access all files in member-photos
CREATE POLICY "Admins can view all member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos' AND EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'loan_officer', 'underwriter', 'compliance_officer')
));

-- Admin policies: Admins can access all files in loan-documents
CREATE POLICY "Admins can view all loan documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'loan-documents' AND EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'loan_officer', 'underwriter', 'compliance_officer')
));
