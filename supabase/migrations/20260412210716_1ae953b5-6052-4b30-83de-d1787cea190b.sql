
-- =============================================
-- PHASE 1: INTEGRATION LAYER
-- =============================================

-- Employee mapping: Tamkeen ↔ Tathbeet
CREATE TABLE public.madad_employee_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES public.tathbeet_staff_profiles(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL DEFAULT 'active',
  mapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id),
  UNIQUE(company_id, staff_profile_id)
);
ALTER TABLE public.madad_employee_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.madad_employee_map FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Unified cross-module transaction ledger
CREATE TABLE public.madad_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL, -- tamkeen, tathbeet, tahseel, takzeen
  source_record_id UUID,
  transaction_type TEXT NOT NULL, -- revenue, expense, cost, adjustment
  amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.madad_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.madad_transactions FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- =============================================
-- PHASE 2: TAHSEEL (FINANCE)
-- =============================================

-- Chart of Accounts
CREATE TABLE public.tahseel_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  account_type TEXT NOT NULL DEFAULT 'expense', -- asset, liability, revenue, expense, equity
  parent_account_id UUID REFERENCES public.tahseel_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, account_code)
);
ALTER TABLE public.tahseel_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.tahseel_accounts FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Journal Entries (header)
CREATE TABLE public.tahseel_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, posted, void
  source_module TEXT, -- auto-generated source
  source_record_id UUID,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, entry_number)
);
ALTER TABLE public.tahseel_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.tahseel_journal_entries FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Journal Lines (debit/credit)
CREATE TABLE public.tahseel_journal_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.tahseel_journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.tahseel_accounts(id),
  debit NUMERIC(14,3) NOT NULL DEFAULT 0,
  credit NUMERIC(14,3) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tahseel_journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation via journal" ON public.tahseel_journal_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tahseel_journal_entries je WHERE je.id = journal_entry_id AND je.company_id = public.get_my_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tahseel_journal_entries je WHERE je.id = journal_entry_id AND je.company_id = public.get_my_company_id()));

-- Invoices
CREATE TABLE public.tahseel_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  booking_id UUID, -- linked to tathbeet_bookings
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  subtotal NUMERIC(14,3) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  discount NUMERIC(14,3) NOT NULL DEFAULT 0,
  total NUMERIC(14,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);
ALTER TABLE public.tahseel_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.tahseel_invoices FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Expenses
CREATE TABLE public.tahseel_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL DEFAULT 'general', -- payroll, inventory, general, operational
  source_module TEXT, -- tamkeen, takzeen
  source_record_id UUID,
  account_id UUID REFERENCES public.tahseel_accounts(id),
  amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, paid
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tahseel_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.tahseel_expenses FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Payment Records
CREATE TABLE public.tahseel_payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.tahseel_invoices(id),
  expense_id UUID REFERENCES public.tahseel_expenses(id),
  amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, bank_transfer, card, wallet
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tahseel_payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.tahseel_payment_records FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- =============================================
-- PHASE 3: TAKZEEN (INVENTORY)
-- =============================================

-- Warehouses
CREATE TABLE public.takzeen_warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  address TEXT,
  city TEXT,
  manager_name TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.takzeen_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.takzeen_warehouses FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Product Categories
CREATE TABLE public.takzeen_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  parent_category_id UUID REFERENCES public.takzeen_categories(id),
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.takzeen_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.takzeen_categories FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Products
CREATE TABLE public.takzeen_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  category_id UUID REFERENCES public.takzeen_categories(id),
  warehouse_id UUID REFERENCES public.takzeen_warehouses(id),
  unit TEXT NOT NULL DEFAULT 'piece', -- piece, kg, liter, box, pack
  unit_cost NUMERIC(14,3) NOT NULL DEFAULT 0,
  selling_price NUMERIC(14,3) NOT NULL DEFAULT 0,
  current_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
  max_stock NUMERIC(14,3),
  barcode TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku)
);
ALTER TABLE public.takzeen_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.takzeen_products FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Stock Movements
CREATE TABLE public.takzeen_stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.takzeen_products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.takzeen_warehouses(id),
  movement_type TEXT NOT NULL, -- in, out, adjustment, return, transfer
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,3),
  reason TEXT,
  reference_type TEXT, -- booking, purchase_order, manual, return
  reference_id UUID,
  performed_by UUID,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.takzeen_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.takzeen_stock_movements FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Suppliers
CREATE TABLE public.takzeen_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  tax_number TEXT,
  payment_terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.takzeen_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.takzeen_suppliers FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Purchase Orders
CREATE TABLE public.takzeen_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.takzeen_suppliers(id),
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, partial, received, cancelled
  total_amount NUMERIC(14,3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IQD',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, po_number)
);
ALTER TABLE public.takzeen_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON public.takzeen_purchase_orders FOR ALL USING (company_id = public.get_my_company_id()) WITH CHECK (company_id = public.get_my_company_id());

-- Purchase Order Items
CREATE TABLE public.takzeen_purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.takzeen_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.takzeen_products(id),
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,3) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.takzeen_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation via PO" ON public.takzeen_purchase_order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.takzeen_purchase_orders po WHERE po.id = purchase_order_id AND po.company_id = public.get_my_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.takzeen_purchase_orders po WHERE po.id = purchase_order_id AND po.company_id = public.get_my_company_id()));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_madad_employee_map_company ON public.madad_employee_map(company_id);
CREATE INDEX idx_madad_transactions_company ON public.madad_transactions(company_id);
CREATE INDEX idx_madad_transactions_source ON public.madad_transactions(source_module, source_record_id);
CREATE INDEX idx_tahseel_accounts_company ON public.tahseel_accounts(company_id);
CREATE INDEX idx_tahseel_journal_entries_company ON public.tahseel_journal_entries(company_id);
CREATE INDEX idx_tahseel_invoices_company ON public.tahseel_invoices(company_id);
CREATE INDEX idx_tahseel_invoices_status ON public.tahseel_invoices(company_id, status);
CREATE INDEX idx_tahseel_expenses_company ON public.tahseel_expenses(company_id);
CREATE INDEX idx_tahseel_payment_records_company ON public.tahseel_payment_records(company_id);
CREATE INDEX idx_takzeen_products_company ON public.takzeen_products(company_id);
CREATE INDEX idx_takzeen_products_sku ON public.takzeen_products(company_id, sku);
CREATE INDEX idx_takzeen_stock_movements_product ON public.takzeen_stock_movements(product_id);
CREATE INDEX idx_takzeen_stock_movements_company ON public.takzeen_stock_movements(company_id);
CREATE INDEX idx_takzeen_purchase_orders_company ON public.takzeen_purchase_orders(company_id);
CREATE INDEX idx_takzeen_suppliers_company ON public.takzeen_suppliers(company_id);
