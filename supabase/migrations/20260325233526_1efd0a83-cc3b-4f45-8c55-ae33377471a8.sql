
-- Fix: tenant_admin role policies - qualify user_id references
CREATE POLICY "tenant_admin_insert_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin')
  AND role NOT IN ('super_admin', 'business_admin', 'finance_manager', 'support_agent', 'sales_manager', 'technical_admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.id = auth.uid() AND p2.id = public.user_roles.user_id
  )
);

CREATE POLICY "tenant_admin_update_roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin')
  AND role NOT IN ('super_admin', 'business_admin', 'finance_manager', 'support_agent', 'sales_manager', 'technical_admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.id = auth.uid() AND p2.id = public.user_roles.user_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin')
  AND role NOT IN ('super_admin', 'business_admin', 'finance_manager', 'support_agent', 'sales_manager', 'technical_admin')
);

CREATE POLICY "tenant_admin_delete_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin')
  AND role NOT IN ('super_admin', 'business_admin', 'finance_manager', 'support_agent', 'sales_manager', 'technical_admin')
  AND EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.company_id = p2.company_id
    WHERE p1.id = auth.uid() AND p2.id = public.user_roles.user_id
  )
);
