
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow public read access to avatars  
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Allow users to update/delete their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- Add half_day column to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT false;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS half_day_period TEXT DEFAULT null;

-- Add avatar_url to employees table for direct link
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT null;
