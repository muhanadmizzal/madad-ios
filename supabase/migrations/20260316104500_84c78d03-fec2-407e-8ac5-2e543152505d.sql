
-- Backfill: Create workflow instances for existing pending leave requests that don't have one
DO $$
DECLARE
  v_lr RECORD;
  v_template_id uuid;
  v_step_order int := 1;
  v_instance_id uuid;
  v_due timestamptz;
  v_employee_user_id uuid;
  v_sla int;
BEGIN
  FOR v_lr IN 
    SELECT lr.* FROM leave_requests lr
    WHERE lr.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM workflow_instances wi 
        WHERE wi.reference_id = lr.id AND wi.request_type = 'leave'
      )
  LOOP
    SELECT user_id INTO v_employee_user_id FROM employees WHERE id = v_lr.employee_id;
    IF v_employee_user_id IS NULL THEN CONTINUE; END IF;

    v_template_id := NULL;
    v_step_order := 1;
    v_due := NULL;

    SELECT wt.id INTO v_template_id FROM workflow_templates wt
      WHERE wt.company_id = v_lr.company_id AND wt.request_type = 'leave' AND wt.is_active = true LIMIT 1;
    IF v_template_id IS NULL THEN
      SELECT wt.id INTO v_template_id FROM workflow_templates wt
        WHERE wt.company_id = v_lr.company_id AND wt.request_type = 'general' AND wt.is_active = true LIMIT 1;
    END IF;

    IF v_template_id IS NOT NULL THEN
      SELECT ws.step_order, ws.sla_hours INTO v_step_order, v_sla FROM workflow_steps ws
        WHERE ws.template_id = v_template_id ORDER BY ws.step_order LIMIT 1;
      IF v_sla IS NOT NULL THEN
        v_due := v_lr.created_at + (v_sla || ' hours')::interval;
      END IF;
    END IF;

    INSERT INTO workflow_instances (company_id, template_id, request_type, reference_id, requester_user_id, current_step_order, status, due_date, created_at)
    VALUES (v_lr.company_id, v_template_id, 'leave', v_lr.id, v_employee_user_id, COALESCE(v_step_order, 1), 'submitted', v_due, v_lr.created_at)
    RETURNING id INTO v_instance_id;

    INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, created_at)
    VALUES (v_instance_id, v_lr.company_id, v_employee_user_id, 'submit', 'draft', 'submitted', 1, v_lr.created_at);
  END LOOP;
END $$;

-- Backfill: Create workflow instances for existing pending certificate requests
DO $$
DECLARE
  v_ar RECORD;
  v_template_id uuid;
  v_step_order int := 1;
  v_instance_id uuid;
  v_due timestamptz;
  v_sla int;
BEGIN
  FOR v_ar IN 
    SELECT ar.* FROM approval_requests ar
    WHERE ar.status = 'pending'
      AND ar.request_type LIKE 'certificate_%'
      AND NOT EXISTS (
        SELECT 1 FROM workflow_instances wi 
        WHERE wi.reference_id = ar.id AND wi.request_type = 'certificate'
      )
  LOOP
    v_template_id := NULL;
    v_step_order := 1;
    v_due := NULL;

    SELECT wt.id INTO v_template_id FROM workflow_templates wt
      WHERE wt.company_id = v_ar.company_id AND wt.request_type = 'certificate' AND wt.is_active = true LIMIT 1;
    IF v_template_id IS NULL THEN
      SELECT wt.id INTO v_template_id FROM workflow_templates wt
        WHERE wt.company_id = v_ar.company_id AND wt.request_type = 'general' AND wt.is_active = true LIMIT 1;
    END IF;

    IF v_template_id IS NOT NULL THEN
      SELECT ws.step_order, ws.sla_hours INTO v_step_order, v_sla FROM workflow_steps ws
        WHERE ws.template_id = v_template_id ORDER BY ws.step_order LIMIT 1;
      IF v_sla IS NOT NULL THEN
        v_due := v_ar.created_at + (v_sla || ' hours')::interval;
      END IF;
    END IF;

    INSERT INTO workflow_instances (company_id, template_id, request_type, reference_id, requester_user_id, current_step_order, status, due_date, created_at)
    VALUES (v_ar.company_id, v_template_id, 'certificate', v_ar.id, v_ar.requester_id, COALESCE(v_step_order, 1), 'submitted', v_due, v_ar.created_at)
    RETURNING id INTO v_instance_id;

    INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, created_at)
    VALUES (v_instance_id, v_ar.company_id, v_ar.requester_id, 'submit', 'draft', 'submitted', 1, v_ar.created_at);
  END LOOP;
END $$;
