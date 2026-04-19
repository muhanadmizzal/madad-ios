
-- Create payroll workflow template for Tamkeen demo tenant
INSERT INTO workflow_templates (id, company_id, name, request_type, description, is_active, auto_generate_document, target_document_type)
VALUES (
  'b1c2d3e4-0001-4000-8000-000000000099',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'سير عمل اعتماد الرواتب',
  'payroll',
  'مسار اعتماد كشوف الرواتب: مدير الموارد البشرية ← المسؤول',
  true,
  false,
  null
) ON CONFLICT DO NOTHING;

-- Add workflow steps
INSERT INTO workflow_steps (template_id, step_order, name, approver_role, sla_hours)
VALUES 
  ('b1c2d3e4-0001-4000-8000-000000000099', 1, 'اعتماد الموارد البشرية', 'hr_manager', 48),
  ('b1c2d3e4-0001-4000-8000-000000000099', 2, 'الاعتماد النهائي', 'tenant_admin', 24)
ON CONFLICT DO NOTHING;
