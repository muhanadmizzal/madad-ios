
-- =====================================================
-- 1. FIX RLS: Add WITH CHECK to UPDATE policies
-- =====================================================

-- leave_requests UPDATE: add WITH CHECK
DROP POLICY IF EXISTS "Admins can update leave requests" ON public.leave_requests;
CREATE POLICY "Admins can update leave requests" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')
      OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'manager')
    )
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- approval_requests UPDATE: add WITH CHECK
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.approval_requests;
CREATE POLICY "Admins can update approval requests" ON public.approval_requests
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')
         OR has_role(auth.uid(), 'tenant_admin') OR has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- workflow_instances UPDATE: add WITH CHECK
DROP POLICY IF EXISTS "Admins can update workflow instances" ON public.workflow_instances;
CREATE POLICY "Admins can update workflow instances" ON public.workflow_instances
  FOR UPDATE TO authenticated
  USING (
    company_id = get_my_company_id()
    AND (
      current_approver_id = auth.uid()
      OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin')
      OR has_role(auth.uid(), 'hr_manager') OR has_role(auth.uid(), 'hr_officer')
      OR has_role(auth.uid(), 'manager')
    )
  )
  WITH CHECK (
    company_id = get_my_company_id()
  );

-- documents UPDATE: add WITH CHECK
DROP POLICY IF EXISTS "HR can update documents" ON public.documents;
CREATE POLICY "HR can update documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin')
         OR has_role(auth.uid(), 'hr_manager') OR has_role(auth.uid(), 'hr_officer'))
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- generated_documents UPDATE: add WITH CHECK
DROP POLICY IF EXISTS "HR can update generated documents" ON public.generated_documents;
CREATE POLICY "HR can update generated documents" ON public.generated_documents
  FOR UPDATE TO authenticated
  USING (
    company_id = get_my_company_id()
    AND is_immutable = false
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr_manager')
         OR has_role(auth.uid(), 'hr_officer'))
  )
  WITH CHECK (
    company_id = get_my_company_id()
  );

-- request_documents UPDATE: add WITH CHECK
DROP POLICY IF EXISTS "hr_manage_request_docs_update" ON public.request_documents;
CREATE POLICY "hr_manage_request_docs_update" ON public.request_documents
  FOR UPDATE TO authenticated
  USING (
    company_id = get_my_company_id()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin')
         OR has_role(auth.uid(), 'hr_manager') OR has_role(auth.uid(), 'hr_officer'))
  )
  WITH CHECK (
    company_id = get_my_company_id()
  );

-- =====================================================
-- 2. Allow employees to INSERT their own request_documents
-- =====================================================
DROP POLICY IF EXISTS "hr_manage_request_docs_insert" ON public.request_documents;
CREATE POLICY "authenticated_insert_request_docs" ON public.request_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_my_company_id()
    AND (
      requester_user_id = auth.uid()
      OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'tenant_admin')
      OR has_role(auth.uid(), 'hr_manager') OR has_role(auth.uid(), 'hr_officer')
    )
  );

-- =====================================================
-- 3. Update create_workflow_instance to resolve approver
--    via org chart manager chain
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_workflow_instance(
  p_request_type text,
  p_reference_id text,
  p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_template record;
  v_first_step record;
  v_instance_id uuid;
  v_due timestamptz;
  v_category text;
  v_resolved_approver_uid uuid;
  v_resolved_approver_pos uuid;
  v_fallback_applied boolean := false;
  v_routing_snapshot jsonb := '{}';
  v_requester_position_id uuid;
  v_requester_manager_uid uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_company_id := COALESCE(p_company_id, get_my_company_id());
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company context';
  END IF;

  -- Template fallback chain: exact type → category → general
  SELECT * INTO v_template FROM public.workflow_templates
    WHERE company_id = v_company_id AND request_type = p_request_type AND is_active = true
    LIMIT 1;

  IF NOT FOUND THEN
    v_category := split_part(p_request_type, '_', 1);
    IF v_category != p_request_type THEN
      SELECT * INTO v_template FROM public.workflow_templates
        WHERE company_id = v_company_id AND request_type = v_category AND is_active = true
        LIMIT 1;
    END IF;
  END IF;

  IF NOT FOUND THEN
    SELECT * INTO v_template FROM public.workflow_templates
      WHERE company_id = v_company_id AND request_type = 'general' AND is_active = true
      LIMIT 1;
  END IF;

  -- Get first step if template exists
  IF FOUND AND v_template.id IS NOT NULL THEN
    SELECT * INTO v_first_step FROM public.workflow_steps
      WHERE template_id = v_template.id ORDER BY step_order LIMIT 1;
    IF v_first_step IS NOT NULL AND v_first_step.sla_hours IS NOT NULL THEN
      v_due := now() + (v_first_step.sla_hours || ' hours')::interval;
    END IF;
  END IF;

  -- Resolve first approver based on routing mode
  IF v_first_step IS NOT NULL THEN
    IF v_first_step.routing_mode = 'position' AND v_first_step.approver_position_id IS NOT NULL THEN
      -- Position-based: resolve via position approver function
      SELECT r.user_id, r.fallback_applied
      INTO v_resolved_approver_uid, v_fallback_applied
      FROM resolve_position_approver_full(
        v_first_step.approver_position_id, v_company_id,
        COALESCE(v_first_step.fallback_mode, 'parent_position')
      ) r LIMIT 1;
      v_resolved_approver_pos := v_first_step.approver_position_id;

    ELSIF v_first_step.routing_mode = 'manager_chain' THEN
      -- Manager chain: find requester's direct manager via org chart
      SELECT e.position_id INTO v_requester_position_id
      FROM employees e
      WHERE e.user_id = v_user_id AND e.company_id = v_company_id AND e.status = 'active'
      LIMIT 1;

      IF v_requester_position_id IS NOT NULL THEN
        -- Get parent position's occupant
        SELECT mgr.user_id, mgr.position_id
        INTO v_resolved_approver_uid, v_resolved_approver_pos
        FROM positions p
        JOIN employees mgr ON mgr.position_id = p.parent_position_id
          AND mgr.company_id = v_company_id AND mgr.status = 'active'
        WHERE p.id = v_requester_position_id
        LIMIT 1;

        -- Fallback: employee's manager_user_id
        IF v_resolved_approver_uid IS NULL THEN
          SELECT e.manager_user_id INTO v_resolved_approver_uid
          FROM employees e
          WHERE e.user_id = v_user_id AND e.company_id = v_company_id
          LIMIT 1;
          v_fallback_applied := v_resolved_approver_uid IS NOT NULL;
        END IF;

        -- Fallback: HR manager
        IF v_resolved_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_resolved_approver_uid
          FROM user_roles ur
          WHERE ur.role = 'hr_manager' AND ur.tenant_id = v_company_id
          LIMIT 1;
          v_fallback_applied := true;
        END IF;

        -- Final fallback: tenant admin
        IF v_resolved_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_resolved_approver_uid
          FROM user_roles ur
          WHERE ur.role = 'tenant_admin' AND ur.tenant_id = v_company_id
          LIMIT 1;
          v_fallback_applied := true;
        END IF;
      END IF;

    ELSE
      -- Role-based routing: try to find a user with the specified role
      IF v_first_step.approver_role IS NOT NULL THEN
        -- First try manager chain as fallback for role-based too
        SELECT e.manager_user_id INTO v_requester_manager_uid
        FROM employees e
        WHERE e.user_id = v_user_id AND e.company_id = v_company_id AND e.status = 'active'
        LIMIT 1;

        IF v_requester_manager_uid IS NOT NULL AND v_first_step.approver_role = 'manager' THEN
          v_resolved_approver_uid := v_requester_manager_uid;
        ELSE
          SELECT ur.user_id INTO v_resolved_approver_uid
          FROM user_roles ur
          WHERE ur.role::text = v_first_step.approver_role AND ur.tenant_id = v_company_id
          LIMIT 1;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Build routing snapshot
  v_routing_snapshot := jsonb_build_object(
    'step', COALESCE(v_first_step.step_order, 1),
    'routing_mode', COALESCE(v_first_step.routing_mode, 'role'),
    'approver_role', v_first_step.approver_role,
    'approver_position_id', v_resolved_approver_pos,
    'resolved_user_id', v_resolved_approver_uid,
    'fallback_applied', v_fallback_applied
  );

  INSERT INTO public.workflow_instances (
    company_id, template_id, request_type, reference_id, requester_user_id,
    current_step_order, status, due_date,
    current_approver_id, current_approver_position_id,
    routing_mode, fallback_used, routing_snapshot
  )
  VALUES (
    v_company_id, v_template.id, p_request_type, p_reference_id, v_user_id,
    COALESCE(v_first_step.step_order, 1), 'submitted', v_due,
    v_resolved_approver_uid, v_resolved_approver_pos,
    COALESCE(v_first_step.routing_mode, 'role'), v_fallback_applied, v_routing_snapshot
  )
  RETURNING id INTO v_instance_id;

  -- Record submit action
  INSERT INTO public.approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order)
  VALUES (v_instance_id, v_company_id, v_user_id, 'submit', 'draft', 'submitted', 1);

  -- Notify resolved approver
  BEGIN
    IF v_resolved_approver_uid IS NOT NULL THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      VALUES (v_company_id, v_resolved_approver_uid, 'طلب موافقة جديد', p_request_type, 'info', '/approvals');
    ELSIF v_first_step IS NOT NULL AND v_first_step.approver_role IS NOT NULL THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_company_id, ur.user_id, 'طلب موافقة جديد', p_request_type, 'info', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role::text = v_first_step.approver_role AND ur.tenant_id = v_company_id
      LIMIT 5;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_instance_id;
END;
$$;
