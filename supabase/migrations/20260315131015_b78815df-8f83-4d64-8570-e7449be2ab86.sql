
-- =============================================
-- APPROVAL WORKFLOW ENGINE - CORE SCHEMA
-- =============================================

-- 1. Workflow Templates (tenant-level)
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  request_type text NOT NULL, -- leave, attendance_correction, payroll, contract, document, onboarding, final_settlement
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, request_type)
);

-- 2. Workflow Steps (ordered approval steps per template)
CREATE TABLE public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 1,
  name text NOT NULL,
  approver_role text NOT NULL DEFAULT 'admin', -- role required to approve this step
  is_optional boolean NOT NULL DEFAULT false,
  auto_approve_condition text, -- optional JSON condition for auto-approval
  sla_hours int DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, step_order)
);

-- 3. Workflow Instances (one per approval request)
CREATE TABLE public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workflow_templates(id),
  request_type text NOT NULL,
  reference_id uuid NOT NULL, -- FK to the source record (leave_request.id, etc.)
  requester_user_id uuid NOT NULL,
  current_step_order int NOT NULL DEFAULT 1,
  current_approver_id uuid, -- specific user assigned
  status text NOT NULL DEFAULT 'submitted',
  -- status: draft, submitted, pending_approval, approved, rejected, returned, locked, archived
  submitted_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  due_date timestamptz,
  is_escalated boolean NOT NULL DEFAULT false,
  final_comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Approval Actions (audit trail per instance)
CREATE TABLE public.approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action text NOT NULL, -- submit, approve, reject, return, escalate, lock, archive
  from_status text NOT NULL,
  to_status text NOT NULL,
  step_order int,
  comments text,
  signature_data text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- workflow_templates: admins manage, all tenant users view
CREATE POLICY "Admins can manage workflow templates" ON public.workflow_templates
  FOR ALL TO authenticated
  USING (company_id = get_my_company_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (company_id = get_my_company_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

CREATE POLICY "Users can view workflow templates" ON public.workflow_templates
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

-- workflow_steps: admins manage, all tenant users view
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps
  FOR ALL TO authenticated
  USING (template_id IN (SELECT id FROM public.workflow_templates WHERE company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)))
  WITH CHECK (template_id IN (SELECT id FROM public.workflow_templates WHERE company_id = get_my_company_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role)));

CREATE POLICY "Users can view workflow steps" ON public.workflow_steps
  FOR SELECT TO authenticated
  USING (template_id IN (SELECT id FROM public.workflow_templates WHERE company_id = get_my_company_id()));

-- workflow_instances: users can see own + admins see all in tenant
CREATE POLICY "Users can view own workflow instances" ON public.workflow_instances
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id() AND (
    requester_user_id = auth.uid()
    OR current_approver_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  ));

CREATE POLICY "Users can insert own workflow instances" ON public.workflow_instances
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND requester_user_id = auth.uid());

CREATE POLICY "Admins can update workflow instances" ON public.workflow_instances
  FOR UPDATE TO authenticated
  USING (company_id = get_my_company_id() AND (
    current_approver_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  ));

-- approval_actions: users see own instance actions, admins see all
CREATE POLICY "Users can view approval actions" ON public.approval_actions
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "System can insert approval actions" ON public.approval_actions
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_my_company_id() AND actor_user_id = auth.uid());

-- 7. Indexes
CREATE INDEX idx_workflow_instances_company ON public.workflow_instances(company_id);
CREATE INDEX idx_workflow_instances_requester ON public.workflow_instances(requester_user_id);
CREATE INDEX idx_workflow_instances_approver ON public.workflow_instances(current_approver_id);
CREATE INDEX idx_workflow_instances_status ON public.workflow_instances(status);
CREATE INDEX idx_workflow_instances_reference ON public.workflow_instances(request_type, reference_id);
CREATE INDEX idx_approval_actions_instance ON public.approval_actions(instance_id);

-- 8. Updated_at triggers
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Approval engine RPC: process approval action
CREATE OR REPLACE FUNCTION public.process_approval_action(
  p_instance_id uuid,
  p_action text,
  p_comments text DEFAULT NULL,
  p_signature_data text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_instance record;
  v_step record;
  v_next_step record;
  v_new_status text;
  v_old_status text;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get instance with lock
  SELECT * INTO v_instance FROM public.workflow_instances WHERE id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow instance not found';
  END IF;

  -- Tenant isolation
  IF v_instance.company_id != get_my_company_id() THEN
    RAISE EXCEPTION 'Cross-tenant action denied';
  END IF;

  v_old_status := v_instance.status;

  -- Validate action against current status
  CASE p_action
    WHEN 'submit' THEN
      IF v_old_status NOT IN ('draft', 'returned') THEN
        RAISE EXCEPTION 'Cannot submit from status %', v_old_status;
      END IF;
      v_new_status := 'pending_approval';

    WHEN 'approve' THEN
      IF v_old_status NOT IN ('submitted', 'pending_approval') THEN
        RAISE EXCEPTION 'Cannot approve from status %', v_old_status;
      END IF;
      -- Check if user is authorized to approve
      IF v_instance.current_approver_id IS NOT NULL AND v_instance.current_approver_id != v_user_id 
         AND NOT has_role(v_user_id, 'admin'::app_role)
         AND NOT has_role(v_user_id, 'hr_manager'::app_role) THEN
        RAISE EXCEPTION 'Not authorized to approve this instance';
      END IF;
      -- Check for next step
      SELECT * INTO v_next_step FROM public.workflow_steps
        WHERE template_id = v_instance.template_id
        AND step_order > v_instance.current_step_order
        AND is_optional = false
        ORDER BY step_order LIMIT 1;
      IF FOUND THEN
        v_new_status := 'pending_approval';
      ELSE
        v_new_status := 'approved';
      END IF;

    WHEN 'reject' THEN
      IF v_old_status NOT IN ('submitted', 'pending_approval') THEN
        RAISE EXCEPTION 'Cannot reject from status %', v_old_status;
      END IF;
      v_new_status := 'rejected';

    WHEN 'return' THEN
      IF v_old_status NOT IN ('submitted', 'pending_approval') THEN
        RAISE EXCEPTION 'Cannot return from status %', v_old_status;
      END IF;
      v_new_status := 'returned';

    WHEN 'escalate' THEN
      IF v_old_status NOT IN ('submitted', 'pending_approval') THEN
        RAISE EXCEPTION 'Cannot escalate from status %', v_old_status;
      END IF;
      v_new_status := 'pending_approval';

    WHEN 'lock' THEN
      IF v_old_status != 'approved' THEN
        RAISE EXCEPTION 'Can only lock approved instances';
      END IF;
      v_new_status := 'locked';

    WHEN 'archive' THEN
      IF v_old_status NOT IN ('approved', 'rejected', 'locked') THEN
        RAISE EXCEPTION 'Can only archive completed instances';
      END IF;
      v_new_status := 'archived';

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  -- Update instance
  UPDATE public.workflow_instances SET
    status = v_new_status,
    current_step_order = CASE
      WHEN p_action = 'approve' AND v_next_step.step_order IS NOT NULL THEN v_next_step.step_order
      WHEN p_action = 'return' THEN 1
      ELSE current_step_order
    END,
    current_approver_id = CASE
      WHEN p_action = 'return' THEN NULL
      ELSE current_approver_id
    END,
    is_escalated = CASE WHEN p_action = 'escalate' THEN true ELSE is_escalated END,
    approved_at = CASE WHEN v_new_status = 'approved' THEN now() ELSE approved_at END,
    rejected_at = CASE WHEN v_new_status = 'rejected' THEN now() ELSE rejected_at END,
    final_comments = COALESCE(p_comments, final_comments)
  WHERE id = p_instance_id;

  -- Record action
  INSERT INTO public.approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_instance.company_id, v_user_id, p_action, v_old_status, v_new_status, v_instance.current_step_order, p_comments, p_signature_data);

  -- Write audit log
  BEGIN
    INSERT INTO public.audit_logs (company_id, user_id, table_name, action, record_id, old_values, new_values)
    VALUES (
      v_instance.company_id, v_user_id, 'workflow_instances',
      'approval_' || p_action,
      p_instance_id,
      jsonb_build_object('status', v_old_status, 'step', v_instance.current_step_order),
      jsonb_build_object('status', v_new_status, 'request_type', v_instance.request_type, 'reference_id', v_instance.reference_id, 'comments', p_comments)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Sync status back to source table
  IF v_new_status IN ('approved', 'rejected') THEN
    CASE v_instance.request_type
      WHEN 'leave' THEN
        UPDATE public.leave_requests SET status = v_new_status, reviewed_by = v_user_id WHERE id = v_instance.reference_id;
      WHEN 'attendance_correction' THEN
        UPDATE public.attendance_corrections SET status = v_new_status, reviewed_by = v_user_id WHERE id = v_instance.reference_id;
      ELSE NULL;
    END CASE;
  ELSIF v_new_status = 'returned' THEN
    CASE v_instance.request_type
      WHEN 'leave' THEN
        UPDATE public.leave_requests SET status = 'pending' WHERE id = v_instance.reference_id;
      WHEN 'attendance_correction' THEN
        UPDATE public.attendance_corrections SET status = 'pending' WHERE id = v_instance.reference_id;
      ELSE NULL;
    END CASE;
  END IF;

  -- Create notification
  BEGIN
    IF p_action IN ('approve', 'reject', 'return') THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      VALUES (
        v_instance.company_id,
        v_instance.requester_user_id,
        CASE p_action
          WHEN 'approve' THEN CASE WHEN v_new_status = 'approved' THEN 'تمت الموافقة على طلبك' ELSE 'تمت الموافقة على مرحلة' END
          WHEN 'reject' THEN 'تم رفض طلبك'
          WHEN 'return' THEN 'تم إرجاع طلبك للتعديل'
        END,
        COALESCE(p_comments, ''),
        CASE p_action WHEN 'approve' THEN 'success' WHEN 'reject' THEN 'warning' ELSE 'info' END,
        '/approvals'
      );
    END IF;

    -- Notify next approver if escalated or moving to next step
    IF p_action = 'approve' AND v_next_step.step_order IS NOT NULL THEN
      -- Notify admins/hr about pending step
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_instance.company_id, ur.user_id, 'طلب موافقة جديد بانتظارك', v_instance.request_type, 'info', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role::text = v_next_step.approver_role
        AND ur.tenant_id = v_instance.company_id
      LIMIT 5;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_result := jsonb_build_object(
    'instance_id', p_instance_id,
    'old_status', v_old_status,
    'new_status', v_new_status,
    'action', p_action
  );
  RETURN v_result;
END;
$$;

-- 10. Function to create workflow instance for a request
CREATE OR REPLACE FUNCTION public.create_workflow_instance(
  p_request_type text,
  p_reference_id uuid,
  p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_template record;
  v_first_step record;
  v_instance_id uuid;
  v_due timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_company_id := COALESCE(p_company_id, get_my_company_id());
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company context';
  END IF;

  -- Find template
  SELECT * INTO v_template FROM public.workflow_templates
    WHERE company_id = v_company_id AND request_type = p_request_type AND is_active = true;

  -- Get first step if template exists
  IF FOUND THEN
    SELECT * INTO v_first_step FROM public.workflow_steps
      WHERE template_id = v_template.id ORDER BY step_order LIMIT 1;
    IF v_first_step.sla_hours IS NOT NULL THEN
      v_due := now() + (v_first_step.sla_hours || ' hours')::interval;
    END IF;
  END IF;

  INSERT INTO public.workflow_instances (company_id, template_id, request_type, reference_id, requester_user_id, current_step_order, status, due_date)
  VALUES (v_company_id, v_template.id, p_request_type, p_reference_id, v_user_id, COALESCE(v_first_step.step_order, 1), 'submitted', v_due)
  RETURNING id INTO v_instance_id;

  -- Record submit action
  INSERT INTO public.approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order)
  VALUES (v_instance_id, v_company_id, v_user_id, 'submit', 'draft', 'submitted', 1);

  -- Notify approvers
  BEGIN
    IF v_first_step.approver_role IS NOT NULL THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_company_id, ur.user_id, 'طلب موافقة جديد', p_request_type, 'info', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role::text = v_first_step.approver_role
        AND ur.tenant_id = v_company_id
      LIMIT 5;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_instance_id;
END;
$$;

-- 11. Enable realtime for workflow_instances
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_instances;
