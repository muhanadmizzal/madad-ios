
-- Create positions for Tamkeen
INSERT INTO public.positions (company_id, title_ar, title_en, department_id, grade_level, min_salary, max_salary, is_manager, status, service_permissions) VALUES
('a1b2c3d4-0001-4000-8000-000000000001', 'المدير العام', 'CEO / General Manager', 'd1000001-0010-4000-8000-000000000001', 10, 3000000, 5000000, true, 'filled', null),
('a1b2c3d4-0001-4000-8000-000000000001', 'مدير الموارد البشرية', 'HR Manager', 'd1000001-0001-4000-8000-000000000001', 8, 1800000, 2800000, true, 'filled', '{"employee_profiles":true,"org_chart":true,"attendance":true,"leave_management":true,"payroll":true,"documents":true,"recruitment":true,"onboarding":true,"performance":true,"learning":true,"approvals":true,"workflows":true,"reports":true,"analytics":true,"ai_hr_assistant":true,"ai_workforce_analytics":true,"ai_recruitment_intelligence":true,"custom_documents":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'مسؤول شؤون الموظفين', 'HR Officer', 'd1000001-0001-4000-8000-000000000001', 6, 1000000, 1500000, false, 'filled', '{"employee_profiles":true,"attendance":true,"leave_management":true,"documents":true,"recruitment":true,"onboarding":true,"approvals":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'مدير المالية', 'Finance Manager', 'd1000001-0002-4000-8000-000000000001', 8, 2000000, 3000000, true, 'filled', '{"payroll":true,"salary_workflow":true,"payroll_workflow":true,"reports":true,"analytics":true,"approvals":true,"documents":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'مدير العمليات', 'Operations Manager', 'd1000001-0003-4000-8000-000000000001', 8, 2000000, 2800000, true, 'filled', '{"employee_profiles":true,"attendance":true,"leave_management":true,"approvals":true,"reports":true,"performance":true,"projects":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'مدير الصيانة', 'Maintenance Manager', 'd1000001-0004-4000-8000-000000000001', 7, 1800000, 2500000, true, 'filled', '{"employee_profiles":true,"attendance":true,"leave_management":true,"approvals":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'مهندس عمليات أول', 'Senior Operations Engineer', 'd1000001-0003-4000-8000-000000000001', 5, 1200000, 1800000, false, 'filled', '{"employee_profiles":true,"attendance":true,"leave_management":true,"documents":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'موظف عمليات', 'Operations Employee', 'd1000001-0003-4000-8000-000000000001', 3, 700000, 1200000, false, 'filled', '{"employee_profiles":true,"attendance":true,"leave_management":true,"documents":true}'::jsonb),
('a1b2c3d4-0001-4000-8000-000000000001', 'محاسب أول', 'Senior Accountant', 'd1000001-0002-4000-8000-000000000001', 5, 1100000, 1600000, false, 'filled', '{"payroll":true,"reports":true,"documents":true,"attendance":true,"leave_management":true}'::jsonb);

-- Link employees to positions
UPDATE public.employees SET position_id = p.id
FROM public.positions p
WHERE employees.company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
  AND p.company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
  AND employees.position = p.title_ar
  AND employees.position_id IS NULL;

-- Set parent hierarchy
UPDATE public.positions SET parent_position_id = (SELECT id FROM positions WHERE title_ar = 'المدير العام' AND company_id = 'a1b2c3d4-0001-4000-8000-000000000001')
WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND title_ar IN ('مدير الموارد البشرية', 'مدير المالية', 'مدير العمليات');

UPDATE public.positions SET parent_position_id = (SELECT id FROM positions WHERE title_ar = 'مدير الموارد البشرية' AND company_id = 'a1b2c3d4-0001-4000-8000-000000000001')
WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND title_ar = 'مسؤول شؤون الموظفين';

UPDATE public.positions SET parent_position_id = (SELECT id FROM positions WHERE title_ar = 'مدير العمليات' AND company_id = 'a1b2c3d4-0001-4000-8000-000000000001')
WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND title_ar IN ('مدير الصيانة', 'مهندس عمليات أول', 'موظف عمليات');

UPDATE public.positions SET parent_position_id = (SELECT id FROM positions WHERE title_ar = 'مدير المالية' AND company_id = 'a1b2c3d4-0001-4000-8000-000000000001')
WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND title_ar = 'محاسب أول';
