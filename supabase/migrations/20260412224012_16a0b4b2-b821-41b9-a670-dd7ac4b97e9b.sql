
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated manage package_catalog_features" ON public.package_catalog_features;

-- Separate write policies for authenticated users
CREATE POLICY "Authenticated insert package_catalog_features"
  ON public.package_catalog_features FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update package_catalog_features"
  ON public.package_catalog_features FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated delete package_catalog_features"
  ON public.package_catalog_features FOR DELETE
  TO authenticated
  USING (true);
