
-- Create resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Allow anyone (including anonymous) to upload to resumes bucket
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'resumes');

-- Authenticated users can read resumes
CREATE POLICY "Authenticated users can read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes');
