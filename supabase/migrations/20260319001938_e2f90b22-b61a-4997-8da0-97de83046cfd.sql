-- Seed salary components for demo tenant (Tamkeen Industrial Services)
INSERT INTO salary_components (company_id, name, type, is_active, is_taxable) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'الراتب الأساسي', 'earning', true, true),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'بدل سكن', 'earning', true, false),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'بدل نقل', 'earning', true, false),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'بدل طعام', 'earning', true, false),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'بدل هاتف', 'earning', true, false),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'خصم تأمينات اجتماعية', 'deduction', true, false),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'خصم ضريبة الدخل', 'deduction', true, false),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'خصم سلفة', 'deduction', true, false)
ON CONFLICT DO NOTHING;

-- Assign salary components to all active employees
INSERT INTO employee_salary_components (employee_id, salary_component_id, amount)
SELECT e.id, sc.id,
  CASE sc.name
    WHEN 'الراتب الأساسي' THEN e.basic_salary
    WHEN 'بدل سكن' THEN ROUND(e.basic_salary * 0.25)
    WHEN 'بدل نقل' THEN ROUND(e.basic_salary * 0.10)
    WHEN 'بدل طعام' THEN 100000
    WHEN 'بدل هاتف' THEN 50000
    WHEN 'خصم تأمينات اجتماعية' THEN ROUND(e.basic_salary * 0.05)
    WHEN 'خصم ضريبة الدخل' THEN 0
    WHEN 'خصم سلفة' THEN 0
    ELSE 0
  END
FROM employees e
CROSS JOIN salary_components sc
WHERE e.company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
  AND e.status = 'active'
  AND sc.company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
  AND sc.is_active = true
ON CONFLICT DO NOTHING;