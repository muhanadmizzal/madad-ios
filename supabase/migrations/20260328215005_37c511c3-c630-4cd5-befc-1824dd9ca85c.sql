
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS promotion_years integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_service_years numeric(5,2) DEFAULT 0;

COMMENT ON COLUMN public.employees.promotion_years IS 'سنوات الترقية';
COMMENT ON COLUMN public.employees.total_service_years IS 'سنوات الخدمة الكلية';
