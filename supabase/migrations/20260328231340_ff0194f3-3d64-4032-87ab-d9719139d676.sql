-- Add default step for the general workflow template (approver_role must not be null)
INSERT INTO public.workflow_steps (template_id, name, step_order, routing_mode, approver_role, sla_hours, fallback_mode)
SELECT wt.id, 'موافقة المدير المباشر', 1, 'manager_chain', 'manager', 48, 'hr_manager'
FROM public.workflow_templates wt
WHERE wt.company_id = 'bb7658d5-6b69-4479-bf01-92261761d347'
  AND wt.request_type = 'general'
  AND wt.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.workflow_steps ws WHERE ws.template_id = wt.id);

INSERT INTO public.workflow_steps (template_id, name, step_order, routing_mode, approver_role, sla_hours, fallback_mode)
SELECT wt.id, 'اعتماد الموارد البشرية', 2, 'role', 'hr_manager', 48, 'hr_manager'
FROM public.workflow_templates wt
WHERE wt.company_id = 'bb7658d5-6b69-4479-bf01-92261761d347'
  AND wt.request_type = 'general'
  AND wt.is_active = true
  AND (SELECT COUNT(*) FROM public.workflow_steps ws WHERE ws.template_id = wt.id) = 1;