
-- Backfill workflow instances for orphaned leave requests
INSERT INTO workflow_instances (company_id, template_id, request_type, reference_id, requester_user_id, current_step_order, status, submitted_at)
SELECT 
  lr.company_id,
  wt.id,
  'leave',
  lr.id,
  e.user_id,
  1,
  'submitted',
  lr.created_at
FROM leave_requests lr
JOIN employees e ON e.id = lr.employee_id
LEFT JOIN workflow_instances wi ON wi.reference_id = lr.id AND wi.request_type = 'leave'
LEFT JOIN workflow_templates wt ON wt.company_id = lr.company_id AND wt.request_type = 'leave' AND wt.is_active = true
WHERE wi.id IS NULL 
  AND lr.created_at > '2026-03-17'
  AND e.user_id IS NOT NULL;
