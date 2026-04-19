
-- Add feature_type column to feature_catalog
ALTER TABLE public.feature_catalog
  ADD COLUMN IF NOT EXISTS feature_type text NOT NULL DEFAULT 'feature';

-- Seed ALL module features into the catalog (skip if key already exists)
INSERT INTO public.feature_catalog (key, name, name_ar, module_key, category, feature_type, pricing_status, monthly_price, yearly_price, per_user_price, sort_order, is_active, description)
VALUES
  -- ============ TAMKEEN (HR) ============
  ('employee_profiles',   'Employee Profiles',       'ملفات الموظفين',              'tamkeen', 'core_hr',         'page',    'free',   0, 0, 0, 10, true, 'Core employee profile management'),
  ('org_chart',            'Org Chart',               'الهيكل التنظيمي',             'tamkeen', 'core_hr',         'page',    'free',   0, 0, 0, 20, true, 'Organization chart and positions'),
  ('attendance',           'Attendance',              'الحضور والانصراف',            'tamkeen', 'core_hr',         'page',    'priced', 5000, 50000, 0, 30, true, 'Time and attendance tracking'),
  ('leave_management',     'Leave Management',        'إدارة الإجازات',              'tamkeen', 'core_hr',         'page',    'priced', 3000, 30000, 0, 40, true, 'Leave requests and balances'),
  ('payroll',              'Payroll',                 'الرواتب',                     'tamkeen', 'core_hr',         'page',    'priced', 10000, 100000, 0, 50, true, 'Salary processing and payslips'),
  ('documents',            'Documents',               'المستندات',                   'tamkeen', 'core_hr',         'page',    'priced', 3000, 30000, 0, 60, true, 'Document management and templates'),
  ('recruitment',          'Recruitment',             'التوظيف',                     'tamkeen', 'talent',          'page',    'priced', 8000, 80000, 0, 70, true, 'Job postings and applicant tracking'),
  ('onboarding',           'Onboarding',              'التهيئة',                     'tamkeen', 'talent',          'page',    'priced', 5000, 50000, 0, 80, true, 'New hire onboarding workflows'),
  ('performance',          'Performance',             'الأداء',                      'tamkeen', 'talent',          'page',    'priced', 5000, 50000, 0, 90, true, 'Performance reviews and appraisals'),
  ('learning',             'Learning',                'التدريب',                     'tamkeen', 'talent',          'page',    'priced', 5000, 50000, 0, 100, true, 'Training and development'),
  ('approvals',            'Approvals',               'الموافقات',                   'tamkeen', 'operations',      'page',    'free',   0, 0, 0, 110, true, 'Multi-step approval workflows'),
  ('workflows',            'Workflows',               'سير العمل',                   'tamkeen', 'operations',      'feature', 'priced', 5000, 50000, 0, 120, true, 'Custom workflow builder'),
  ('reports',              'Reports',                 'التقارير',                    'tamkeen', 'operations',      'page',    'priced', 3000, 30000, 0, 130, true, 'HR reports and analytics'),
  ('analytics',            'Analytics',               'التحليلات',                   'tamkeen', 'operations',      'page',    'priced', 5000, 50000, 0, 140, true, 'Advanced workforce analytics'),
  ('projects',             'Projects',                'المشاريع',                    'tamkeen', 'operations',      'page',    'priced', 5000, 50000, 0, 150, true, 'Project and task management'),
  ('multi_branch',         'Multi Branch',            'تعدد الفروع',                 'tamkeen', 'admin_advanced',  'feature', 'priced', 8000, 80000, 0, 160, true, 'Multi-branch management'),
  ('api_access',           'API Access',              'الوصول للـ API',              'tamkeen', 'admin_advanced',  'feature', 'priced', 15000, 150000, 0, 170, true, 'REST API access'),
  ('advanced_analytics',   'Advanced Analytics',      'تحليلات متقدمة',             'tamkeen', 'admin_advanced',  'feature', 'priced', 10000, 100000, 0, 180, true, 'Advanced analytics and BI'),
  ('custom_documents',     'Custom Documents',        'مستندات مخصصة',              'tamkeen', 'admin_advanced',  'feature', 'priced', 5000, 50000, 0, 190, true, 'Custom document templates'),
  ('salary_workflow',      'Salary Workflow',         'سير عمل الرواتب',            'tamkeen', 'admin_advanced',  'feature', 'priced', 5000, 50000, 0, 200, true, 'Multi-step salary approval'),
  ('payroll_workflow',     'Payroll Workflow',         'سير عمل كشف الرواتب',        'tamkeen', 'admin_advanced',  'feature', 'priced', 5000, 50000, 0, 210, true, 'Payroll processing workflow'),
  -- AI Tools (Tamkeen)
  ('ai_hr_assistant',            'AI HR Assistant',         'مساعد الموارد البشرية الذكي', 'tamkeen', 'ai_tools', 'feature', 'priced', 15000, 150000, 0, 300, true, 'AI-powered HR assistant'),
  ('ai_employee_career_coach',   'AI Employee Coach',       'مدرب الموظف الذكي',           'tamkeen', 'ai_tools', 'feature', 'priced', 10000, 100000, 0, 310, true, 'AI career coaching for employees'),
  ('ai_workforce_analytics',     'AI Workforce Analytics',  'تحليلات القوى العاملة',       'tamkeen', 'ai_tools', 'feature', 'priced', 15000, 150000, 0, 320, true, 'AI-powered workforce insights'),
  ('ai_recruitment_intelligence','AI Recruitment',          'ذكاء التوظيف',                'tamkeen', 'ai_tools', 'feature', 'priced', 12000, 120000, 0, 330, true, 'AI-powered recruitment screening'),
  ('ai_gap_analysis',            'AI Gap Analysis',         'تحليل الفجوات',               'tamkeen', 'ai_tools', 'feature', 'priced', 10000, 100000, 0, 340, true, 'AI organizational gap analysis'),
  ('ai_planning_advisor',        'AI Planning Advisor',     'مستشار التخطيط',              'tamkeen', 'ai_tools', 'feature', 'priced', 10000, 100000, 0, 350, true, 'AI-powered planning recommendations'),

  -- ============ TATHBEET (Booking) ============
  ('tathbeet_dashboard',    'Booking Dashboard',       'لوحة الحجوزات',               'tathbeet', 'operations', 'page',    'free',   0, 0, 0, 400, true, 'Booking operations dashboard'),
  ('tathbeet_bookings',     'Bookings',                'إدارة الحجوزات',              'tathbeet', 'operations', 'page',    'priced', 8000, 80000, 0, 410, true, 'Booking management and calendar'),
  ('tathbeet_services',     'Services',                'الخدمات',                     'tathbeet', 'operations', 'page',    'free',   0, 0, 0, 420, true, 'Service catalog management'),
  ('tathbeet_customers',    'Customers',               'العملاء',                     'tathbeet', 'operations', 'page',    'priced', 5000, 50000, 0, 430, true, 'Customer database'),
  ('tathbeet_staff',        'Staff',                   'الموظفون',                    'tathbeet', 'operations', 'page',    'free',   0, 0, 0, 440, true, 'Staff scheduling'),
  ('tathbeet_branches',     'Branches',                'الفروع',                      'tathbeet', 'operations', 'page',    'priced', 5000, 50000, 0, 450, true, 'Multi-branch booking'),
  ('tathbeet_walk_ins',     'Walk-ins',                'العملاء بدون موعد',           'tathbeet', 'operations', 'feature', 'priced', 3000, 30000, 0, 460, true, 'Walk-in queue management'),
  ('tathbeet_loyalty',      'Loyalty Program',         'برنامج الولاء',               'tathbeet', 'operations', 'feature', 'priced', 8000, 80000, 0, 470, true, 'Customer loyalty and rewards'),
  ('tathbeet_analytics',    'Booking Analytics',       'تحليلات الحجوزات',            'tathbeet', 'operations', 'page',    'priced', 5000, 50000, 0, 480, true, 'Booking analytics and reports'),
  ('tathbeet_ai',           'AI Booking Assistant',    'مساعد الحجز الذكي',           'tathbeet', 'ai_tools',   'feature', 'priced', 12000, 120000, 0, 490, true, 'AI-powered booking optimization'),

  -- ============ TAHSEEL (Finance) ============
  ('tahseel_dashboard',     'Finance Dashboard',       'لوحة المالية',                'tahseel', 'operations', 'page',    'free',   0, 0, 0, 500, true, 'Finance overview dashboard'),
  ('tahseel_accounts',      'Chart of Accounts',       'شجرة الحسابات',               'tahseel', 'operations', 'page',    'free',   0, 0, 0, 510, true, 'Chart of accounts management'),
  ('tahseel_journal',       'Journal Entries',         'القيود اليومية',              'tahseel', 'operations', 'page',    'priced', 8000, 80000, 0, 520, true, 'Double-entry journal'),
  ('tahseel_invoices',      'Invoices',                'الفواتير',                    'tahseel', 'operations', 'page',    'priced', 8000, 80000, 0, 530, true, 'Invoice management'),
  ('tahseel_expenses',      'Expenses',                'المصروفات',                   'tahseel', 'operations', 'page',    'priced', 5000, 50000, 0, 540, true, 'Expense tracking'),
  ('tahseel_payments',      'Payments',                'المدفوعات',                   'tahseel', 'operations', 'page',    'priced', 5000, 50000, 0, 550, true, 'Payment processing'),
  ('tahseel_reports',       'Financial Reports',       'التقارير المالية',            'tahseel', 'operations', 'page',    'priced', 8000, 80000, 0, 560, true, 'Financial reporting'),

  -- ============ TAKZEEN (Inventory) ============
  ('takzeen_dashboard',     'Inventory Dashboard',     'لوحة المخزون',                'takzeen', 'operations', 'page',    'free',   0, 0, 0, 600, true, 'Inventory overview dashboard'),
  ('takzeen_products',      'Products',                'المنتجات',                    'takzeen', 'operations', 'page',    'priced', 5000, 50000, 0, 610, true, 'Product catalog and SKUs'),
  ('takzeen_warehouses',    'Warehouses',              'المستودعات',                  'takzeen', 'operations', 'page',    'free',   0, 0, 0, 620, true, 'Warehouse management'),
  ('takzeen_movements',     'Stock Movements',         'حركة المخزون',               'takzeen', 'operations', 'page',    'priced', 5000, 50000, 0, 630, true, 'Stock in/out tracking'),
  ('takzeen_suppliers',     'Suppliers',               'الموردون',                    'takzeen', 'operations', 'page',    'priced', 3000, 30000, 0, 640, true, 'Supplier management'),
  ('takzeen_purchase_orders','Purchase Orders',        'أوامر الشراء',                'takzeen', 'operations', 'page',    'priced', 8000, 80000, 0, 650, true, 'Procurement workflow'),
  ('takzeen_reports',       'Inventory Reports',       'تقارير المخزون',              'takzeen', 'operations', 'page',    'priced', 5000, 50000, 0, 660, true, 'Inventory analytics')

ON CONFLICT (key) DO NOTHING;
