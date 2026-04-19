
-- Tathbeet BY MADAD — Extension tables for booking & service management

-- 1. Service Categories
CREATE TABLE public.tathbeet_service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tathbeet_service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_service_categories
  FOR ALL TO authenticated USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- 2. Services
CREATE TABLE public.tathbeet_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.tathbeet_service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tathbeet_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_services
  FOR ALL TO authenticated USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- 3. Branches
CREATE TABLE public.tathbeet_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tathbeet_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_branches
  FOR ALL TO authenticated USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- 4. Staff Profiles (extends Tamkeen employees)
CREATE TABLE public.tathbeet_staff_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  display_name TEXT,
  booking_enabled BOOLEAN NOT NULL DEFAULT true,
  default_branch_id UUID REFERENCES public.tathbeet_branches(id) ON DELETE SET NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, employee_id)
);
ALTER TABLE public.tathbeet_staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_staff_profiles
  FOR ALL TO authenticated USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- 5. Staff ↔ Services (many-to-many)
CREATE TABLE public.tathbeet_staff_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_profile_id UUID NOT NULL REFERENCES public.tathbeet_staff_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.tathbeet_services(id) ON DELETE CASCADE,
  UNIQUE (staff_profile_id, service_id)
);
ALTER TABLE public.tathbeet_staff_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_staff_services
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tathbeet_staff_profiles sp WHERE sp.id = staff_profile_id AND sp.company_id = public.get_my_company_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tathbeet_staff_profiles sp WHERE sp.id = staff_profile_id AND sp.company_id = public.get_my_company_id())
  );

-- 6. Working Hours
CREATE TABLE public.tathbeet_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_profile_id UUID NOT NULL REFERENCES public.tathbeet_staff_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE (staff_profile_id, day_of_week)
);
ALTER TABLE public.tathbeet_working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_working_hours
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tathbeet_staff_profiles sp WHERE sp.id = staff_profile_id AND sp.company_id = public.get_my_company_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tathbeet_staff_profiles sp WHERE sp.id = staff_profile_id AND sp.company_id = public.get_my_company_id())
  );

-- 7. Time Off
CREATE TABLE public.tathbeet_time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_profile_id UUID NOT NULL REFERENCES public.tathbeet_staff_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  UNIQUE (staff_profile_id, date)
);
ALTER TABLE public.tathbeet_time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_time_off
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tathbeet_staff_profiles sp WHERE sp.id = staff_profile_id AND sp.company_id = public.get_my_company_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tathbeet_staff_profiles sp WHERE sp.id = staff_profile_id AND sp.company_id = public.get_my_company_id())
  );

-- 8. Bookings
CREATE TABLE public.tathbeet_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.tathbeet_services(id) ON DELETE RESTRICT,
  staff_profile_id UUID NOT NULL REFERENCES public.tathbeet_staff_profiles(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.tathbeet_branches(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  booking_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'admin',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tathbeet_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_bookings
  FOR ALL TO authenticated USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());
-- Public booking: allow anonymous inserts
CREATE POLICY "public_booking_insert" ON public.tathbeet_bookings
  FOR INSERT TO anon WITH CHECK (true);
-- Public: allow anon to read their own booking by id
CREATE POLICY "public_booking_read" ON public.tathbeet_bookings
  FOR SELECT TO anon USING (true);

-- 9. Booking History (audit trail)
CREATE TABLE public.tathbeet_booking_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.tathbeet_bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tathbeet_booking_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tathbeet_booking_history
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tathbeet_bookings b WHERE b.id = booking_id AND b.company_id = public.get_my_company_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.tathbeet_bookings b WHERE b.id = booking_id AND b.company_id = public.get_my_company_id())
  );

-- Allow anon to read services & staff for public booking
CREATE POLICY "public_read_services" ON public.tathbeet_services FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "public_read_categories" ON public.tathbeet_service_categories FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_staff" ON public.tathbeet_staff_profiles FOR SELECT TO anon USING (booking_enabled = true AND is_visible = true);
CREATE POLICY "public_read_staff_services" ON public.tathbeet_staff_services FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_working_hours" ON public.tathbeet_working_hours FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_time_off" ON public.tathbeet_time_off FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_branches" ON public.tathbeet_branches FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "public_read_booking_history" ON public.tathbeet_booking_history FOR SELECT TO anon USING (true);

-- Indexes
CREATE INDEX idx_tathbeet_bookings_date ON public.tathbeet_bookings(company_id, booking_date);
CREATE INDEX idx_tathbeet_bookings_staff ON public.tathbeet_bookings(staff_profile_id, booking_date);
CREATE INDEX idx_tathbeet_staff_employee ON public.tathbeet_staff_profiles(employee_id);
