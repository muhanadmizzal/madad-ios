
-- 1. Update process_approval_action to sync ALL module types back to source tables
CREATE OR REPLACE FUNCTION public.process_approval_action(p_instance_id uuid, p_action text, p_comments text DEFAULT NULL::text, p_signature_data text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT * INTO v_instance FROM public.workflow_instances WHERE id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow instance not found';
  END IF;

  IF v_instance.company_id != get_my_company_id() THEN
    RAISE EXCEPTION 'Cross-tenant action denied';
  END IF;

  v_old_status := v_instance.status;

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
      IF v_instance.current_approver_id IS NOT NULL AND v_instance.current_approver_id != v_user_id 
         AND NOT has_role(v_user_id, 'admin'::app_role)
         AND NOT has_role(v_user_id, 'hr_manager'::app_role) THEN
        RAISE EXCEPTION 'Not authorized to approve this instance';
      END IF;
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

  INSERT INTO public.approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_instance.company_id, v_user_id, p_action, v_old_status, v_new_status, v_instance.current_step_order, p_comments, p_signature_data);

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

  -- Sync status back to ALL source tables
  IF v_new_status IN ('approved', 'rejected') THEN
    CASE v_instance.request_type
      WHEN 'leave' THEN
        UPDATE public.leave_requests SET status = v_new_status, reviewed_by = v_user_id WHERE id = v_instance.reference_id;
      WHEN 'attendance_correction' THEN
        UPDATE public.attendance_corrections SET status = v_new_status, reviewed_by = v_user_id WHERE id = v_instance.reference_id;
      WHEN 'payroll' THEN
        IF v_new_status = 'approved' THEN
          UPDATE public.payroll_runs SET status = 'approved', approved_by = v_user_id WHERE id = v_instance.reference_id;
        END IF;
      WHEN 'contract' THEN
        IF v_new_status = 'approved' THEN
          UPDATE public.contracts SET status = 'active' WHERE id = v_instance.reference_id;
        ELSIF v_new_status = 'rejected' THEN
          UPDATE public.contracts SET status = 'terminated' WHERE id = v_instance.reference_id;
        END IF;
      WHEN 'final_settlement' THEN
        IF v_new_status = 'approved' THEN
          UPDATE public.exit_clearance SET status = 'completed' WHERE id = v_instance.reference_id;
        ELSIF v_new_status = 'rejected' THEN
          UPDATE public.exit_clearance SET status = 'cancelled' WHERE id = v_instance.reference_id;
        END IF;
      ELSE NULL;
    END CASE;
  ELSIF v_new_status = 'returned' THEN
    CASE v_instance.request_type
      WHEN 'leave' THEN
        UPDATE public.leave_requests SET status = 'pending' WHERE id = v_instance.reference_id;
      WHEN 'attendance_correction' THEN
        UPDATE public.attendance_corrections SET status = 'pending' WHERE id = v_instance.reference_id;
      WHEN 'payroll' THEN
        UPDATE public.payroll_runs SET status = 'draft' WHERE id = v_instance.reference_id;
      ELSE NULL;
    END CASE;
  ELSIF v_new_status = 'locked' THEN
    CASE v_instance.request_type
      WHEN 'payroll' THEN
        UPDATE public.payroll_runs SET status = 'paid' WHERE id = v_instance.reference_id;
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

    IF p_action = 'approve' AND v_next_step.step_order IS NOT NULL THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_instance.company_id, ur.user_id, 'طلب موافقة جديد بانتظارك', v_instance.request_type, 'info', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role::text = v_next_step.approver_role
        AND ur.tenant_id = v_instance.company_id
      LIMIT 5;
    END IF;

    IF p_action = 'escalate' THEN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_instance.company_id, ur.user_id, 'طلب مصعّد يتطلب تدخلك', COALESCE(p_comments, v_instance.request_type), 'warning', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role IN ('admin'::app_role, 'hr_manager'::app_role)
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
$function$;

-- 2. Create SLA check function
CREATE OR REPLACE FUNCTION public.check_overdue_approvals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_overdue record;
  v_count int := 0;
BEGIN
  FOR v_overdue IN
    SELECT wi.id, wi.company_id, wi.requester_user_id, wi.request_type, wi.due_date, wi.current_step_order, wi.is_escalated,
           wt.name as template_name
    FROM public.workflow_instances wi
    LEFT JOIN public.workflow_templates wt ON wt.id = wi.template_id
    WHERE wi.status IN ('submitted', 'pending_approval')
      AND wi.due_date IS NOT NULL
      AND wi.due_date < now()
  LOOP
    v_count := v_count + 1;

    -- Send overdue notification to admins
    BEGIN
      INSERT INTO public.notifications (company_id, user_id, title, message, type, link)
      SELECT v_overdue.company_id, ur.user_id,
        'طلب متأخر عن الموعد المحدد',
        format('طلب %s متأخر منذ %s', v_overdue.request_type, v_overdue.due_date::text),
        'warning', '/approvals'
      FROM public.user_roles ur
      WHERE ur.role IN ('admin'::app_role, 'hr_manager'::app_role)
        AND ur.tenant_id = v_overdue.company_id
      LIMIT 3;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Auto-escalate if not already escalated and overdue by >24h
    IF NOT v_overdue.is_escalated AND v_overdue.due_date < (now() - interval '24 hours') THEN
      UPDATE public.workflow_instances SET is_escalated = true WHERE id = v_overdue.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('overdue_count', v_count, 'checked_at', now());
END;
$function$;
