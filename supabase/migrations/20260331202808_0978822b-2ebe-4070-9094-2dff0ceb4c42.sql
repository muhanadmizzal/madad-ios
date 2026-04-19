
-- Add offer_approval handling to the sync logic in process_approval_action
CREATE OR REPLACE FUNCTION public.process_approval_action(
  p_instance_id uuid,
  p_action text,
  p_comments text DEFAULT NULL,
  p_signature_data text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance record;
  v_step record;
  v_next_step record;
  v_from_status text;
  v_to_status text;
  v_company_id uuid;
  v_actor_user_id uuid;
  v_generated_doc_id uuid;
  v_template record;
  v_next_approver_uid uuid;
  v_next_approver_pos uuid;
  v_next_approver_name text;
  v_requester_pos uuid;
  v_employee record;
  v_company record;
  v_cert_content text;
  v_cert_type text;
BEGIN
  v_actor_user_id := auth.uid();
  IF v_actor_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_instance FROM workflow_instances WHERE id = p_instance_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workflow instance not found'; END IF;

  v_company_id := v_instance.company_id;
  v_from_status := v_instance.status;

  -- Permission check
  IF p_action IN ('approve', 'reject', 'return') THEN
    IF v_instance.current_approver_id IS NOT NULL AND v_instance.current_approver_id != v_actor_user_id
       AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_actor_user_id AND role IN ('hr_manager', 'tenant_admin', 'admin') AND tenant_id = v_company_id) THEN
      RAISE EXCEPTION 'ليس لديك صلاحية اتخاذ هذا الإجراء';
    END IF;
    IF v_instance.requester_user_id = v_actor_user_id AND p_action = 'approve'
       AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_actor_user_id AND role IN ('hr_manager', 'tenant_admin', 'admin') AND tenant_id = v_company_id) THEN
      RAISE EXCEPTION 'لا يمكنك الموافقة على طلبك الخاص';
    END IF;
  END IF;

  -- Get current step
  IF v_instance.template_id IS NOT NULL THEN
    SELECT * INTO v_step FROM workflow_steps WHERE template_id = v_instance.template_id AND step_order = v_instance.current_step_order;
  END IF;

  -- Get requester position
  SELECT e.position_id INTO v_requester_pos
  FROM employees e WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

  CASE p_action
    WHEN 'submit' THEN
      v_to_status := 'pending_approval';
      UPDATE workflow_instances SET status = v_to_status, current_step_order = 1, submitted_at = now(), updated_at = now() WHERE id = p_instance_id;

    WHEN 'approve' THEN
      -- Check for next step
      IF v_instance.template_id IS NOT NULL THEN
        SELECT * INTO v_next_step FROM workflow_steps
        WHERE template_id = v_instance.template_id AND step_order > v_instance.current_step_order ORDER BY step_order LIMIT 1;
      END IF;

      IF v_next_step IS NOT NULL THEN
        -- Advance to next step - resolve approver
        IF v_next_step.routing_mode = 'manager_chain' AND v_requester_pos IS NOT NULL THEN
          SELECT r.approver_user_id, r.approver_position_id, r.approver_name
          INTO v_next_approver_uid, v_next_approver_pos, v_next_approver_name
          FROM resolve_hierarchy_approver(v_requester_pos, v_company_id) r LIMIT 1;
        ELSIF v_next_step.routing_mode = 'position' AND v_next_step.approver_position_id IS NOT NULL THEN
          SELECT e.user_id, e.name_ar, e.position_id INTO v_next_approver_uid, v_next_approver_name, v_next_approver_pos
          FROM employees e WHERE e.position_id = v_next_step.approver_position_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
        ELSIF v_next_step.routing_mode = 'role' AND v_next_step.approver_role IS NOT NULL THEN
          SELECT ur.user_id INTO v_next_approver_uid
          FROM user_roles ur WHERE ur.role::text = v_next_step.approver_role AND ur.tenant_id = v_company_id LIMIT 1;
          IF v_next_approver_uid IS NOT NULL THEN
            SELECT e.name_ar, e.position_id INTO v_next_approver_name, v_next_approver_pos
            FROM employees e WHERE e.user_id = v_next_approver_uid AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;
          END IF;
        END IF;
        IF v_next_approver_uid IS NULL THEN
          SELECT ur.user_id INTO v_next_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id LIMIT 1;
        END IF;

        v_to_status := 'pending_approval';
        UPDATE workflow_instances SET status = v_to_status, current_step_order = v_next_step.step_order,
          current_approver_id = v_next_approver_uid, current_approver_position_id = v_next_approver_pos, updated_at = now()
        WHERE id = p_instance_id;
      ELSE
        -- Final approval
        v_to_status := 'approved';
        UPDATE workflow_instances SET status = v_to_status, approved_at = now(), completed_at = now(), current_approver_id = NULL, updated_at = now() WHERE id = p_instance_id;

        -- === SYNC TO SOURCE TABLE ===
        IF v_instance.request_type = 'leave' THEN
          UPDATE leave_requests SET status = 'approved' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'attendance_correction' THEN
          UPDATE attendance_corrections SET status = 'approved' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'payroll' THEN
          UPDATE payroll_runs SET status = 'approved' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'contract' THEN
          UPDATE contracts SET status = 'active' WHERE id = v_instance.reference_id;
        ELSIF v_instance.request_type = 'offer_approval' THEN
          -- Move candidate from offer_pending to offer stage
          UPDATE candidates SET stage = 'offer' WHERE id = v_instance.reference_id;
          -- Record stage history
          INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, changed_by, notes)
          VALUES (v_instance.reference_id, 'offer_pending', 'offer', v_actor_user_id, 'تمت الموافقة على نقل المرشح لمرحلة العرض');
        END IF;

        -- For ALL certificate/document types: sync approval_requests
        IF v_instance.request_type LIKE 'certificate%' OR v_instance.request_type IN ('document', 'general') THEN
          UPDATE approval_requests SET status = 'approved', approved_by = v_actor_user_id, updated_at = now()
          WHERE id = v_instance.reference_id;

          -- Auto-generate certificate document
          IF v_instance.request_type LIKE 'certificate%' THEN
            BEGIN
              SELECT e.* INTO v_employee
              FROM employees e WHERE e.user_id = v_instance.requester_user_id AND e.company_id = v_company_id AND e.status = 'active' LIMIT 1;

              IF v_employee IS NULL THEN
                SELECT e.* INTO v_employee
                FROM approval_requests ar
                JOIN employees e ON e.user_id = ar.requester_id AND e.company_id = v_company_id AND e.status = 'active'
                WHERE ar.id = v_instance.reference_id
                LIMIT 1;
              END IF;

              IF v_employee IS NULL THEN
                SELECT e.* INTO v_employee
                FROM approval_requests ar
                JOIN employees e ON e.id = ar.record_id AND e.company_id = v_company_id AND e.status = 'active'
                WHERE ar.id = v_instance.reference_id
                LIMIT 1;
              END IF;

              IF v_employee IS NULL THEN
                SELECT e.* INTO v_employee
                FROM employees e
                WHERE e.company_id = v_company_id AND e.status = 'active'
                AND (e.user_id = v_instance.requester_user_id
                  OR e.id = (SELECT ar2.record_id FROM approval_requests ar2 WHERE ar2.id = v_instance.reference_id LIMIT 1))
                LIMIT 1;
              END IF;

              SELECT c.* INTO v_company FROM companies c WHERE c.id = v_company_id;

              IF v_employee IS NOT NULL AND v_company IS NOT NULL THEN
                v_cert_type := replace(v_instance.request_type, 'certificate_', '');
                IF v_cert_type = v_instance.request_type THEN v_cert_type := 'experience'; END IF;

                IF v_cert_type = 'experience' THEN
                  v_cert_content := 'شهادة خبرة' || E'\n\n' ||
                    'نشهد نحن ' || COALESCE(v_company.name_ar, v_company.name, '') || ' بأن السيد/السيدة ' ||
                    COALESCE(v_employee.name_ar, '') || ' يحمل/تحمل رقم وظيفي ' || COALESCE(v_employee.employee_code, '') ||
                    ' قد عمل/عملت لدينا بمنصب ' || COALESCE(v_employee.position, '') ||
                    ' اعتباراً من تاريخ ' || COALESCE(v_employee.hire_date::text, '') || '.' ||
                    E'\n\n' || 'أعطيت هذه الشهادة بناءً على طلبه/طلبها دون أي مسؤولية على الشركة.' ||
                    E'\n\n' || 'التاريخ: ' || to_char(now(), 'YYYY-MM-DD');
                ELSIF v_cert_type = 'salary' THEN
                  v_cert_content := 'شهادة راتب' || E'\n\n' ||
                    'نشهد نحن ' || COALESCE(v_company.name_ar, v_company.name, '') || ' بأن السيد/السيدة ' ||
                    COALESCE(v_employee.name_ar, '') || ' يحمل/تحمل رقم وظيفي ' || COALESCE(v_employee.employee_code, '') ||
                    ' يعمل/تعمل لدينا بمنصب ' || COALESCE(v_employee.position, '') ||
                    ' وأن راتبه/راتبها الأساسي هو ' || COALESCE(v_employee.basic_salary::text, '0') || ' ' || COALESCE(v_company.default_currency, 'IQD') || '.' ||
                    E'\n\n' || 'أعطيت هذه الشهادة بناءً على طلبه/طلبها لتقديمها للجهات المختصة.' ||
                    E'\n\n' || 'التاريخ: ' || to_char(now(), 'YYYY-MM-DD');
                ELSIF v_cert_type = 'employment' THEN
                  v_cert_content := 'تعريف بالراتب' || E'\n\n' ||
                    'إلى من يهمه الأمر' || E'\n\n' ||
                    'نفيدكم بأن السيد/السيدة ' || COALESCE(v_employee.name_ar, '') ||
                    ' يحمل/تحمل رقم وظيفي ' || COALESCE(v_employee.employee_code, '') ||
                    ' يعمل/تعمل لدى ' || COALESCE(v_company.name_ar, v_company.name, '') ||
                    ' بمنصب ' || COALESCE(v_employee.position, '') ||
                    ' منذ تاريخ ' || COALESCE(v_employee.hire_date::text, '') ||
                    ' وأن راتبه/راتبها الأساسي ' || COALESCE(v_employee.basic_salary::text, '0') || ' ' || COALESCE(v_company.default_currency, 'IQD') || '.' ||
                    E'\n\n' || 'أعطي هذا التعريف بناءً على طلبه/طلبها دون أي مسؤولية على الشركة.' ||
                    E'\n\n' || 'التاريخ: ' || to_char(now(), 'YYYY-MM-DD');
                ELSE
                  v_cert_content := 'شهادة رسمية' || E'\n\n' ||
                    'الموظف: ' || COALESCE(v_employee.name_ar, '') || E'\n' ||
                    'الشركة: ' || COALESCE(v_company.name_ar, v_company.name, '') || E'\n' ||
                    'التاريخ: ' || to_char(now(), 'YYYY-MM-DD');
                END IF;

                INSERT INTO generated_documents (company_id, employee_id, document_type, title, content, status, generated_by, request_id)
                VALUES (
                  v_company_id, v_employee.id,
                  CASE v_cert_type WHEN 'experience' THEN 'experience_cert' WHEN 'salary' THEN 'salary_cert' WHEN 'employment' THEN 'employment_cert' ELSE 'official_letter' END,
                  CASE v_cert_type WHEN 'experience' THEN 'شهادة خبرة' WHEN 'salary' THEN 'شهادة راتب' WHEN 'employment' THEN 'تعريف بالراتب' ELSE 'شهادة رسمية' END || ' - ' || COALESCE(v_employee.name_ar, ''),
                  v_cert_content,
                  'approved',
                  v_actor_user_id,
                  v_instance.reference_id
                ) RETURNING id INTO v_generated_doc_id;
              END IF;
            EXCEPTION WHEN OTHERS THEN
              RAISE WARNING 'Certificate generation failed: %', SQLERRM;
            END;
          END IF;
        END IF;
      END IF;

    WHEN 'reject' THEN
      v_to_status := 'rejected';
      UPDATE workflow_instances SET status = v_to_status, rejected_at = now(), completed_at = now(), final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
      IF v_instance.request_type = 'leave' THEN
        UPDATE leave_requests SET status = 'rejected' WHERE id = v_instance.reference_id;
      ELSIF v_instance.request_type = 'attendance_correction' THEN
        UPDATE attendance_corrections SET status = 'rejected' WHERE id = v_instance.reference_id;
      ELSIF v_instance.request_type = 'offer_approval' THEN
        -- Move candidate back to interview stage
        UPDATE candidates SET stage = 'interview' WHERE id = v_instance.reference_id;
        INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, changed_by, notes)
        VALUES (v_instance.reference_id, 'offer_pending', 'interview', v_actor_user_id, COALESCE(p_comments, 'تم رفض طلب نقل المرشح لمرحلة العرض'));
      END IF;
      IF v_instance.request_type LIKE 'certificate%' OR v_instance.request_type IN ('document', 'general') THEN
        UPDATE approval_requests SET status = 'rejected', rejected_by = v_actor_user_id, updated_at = now()
        WHERE id = v_instance.reference_id;
      END IF;

    WHEN 'return' THEN
      v_to_status := 'returned';
      UPDATE workflow_instances SET status = v_to_status, final_comments = p_comments, updated_at = now() WHERE id = p_instance_id;
      IF v_instance.request_type = 'leave' THEN
        UPDATE leave_requests SET status = 'returned' WHERE id = v_instance.reference_id;
      END IF;
      IF v_instance.request_type LIKE 'certificate%' OR v_instance.request_type IN ('document', 'general') THEN
        UPDATE approval_requests SET status = 'returned', updated_at = now() WHERE id = v_instance.reference_id;
      END IF;
      IF v_instance.request_type = 'offer_approval' THEN
        UPDATE candidates SET stage = 'interview' WHERE id = v_instance.reference_id;
        INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, changed_by, notes)
        VALUES (v_instance.reference_id, 'offer_pending', 'interview', v_actor_user_id, COALESCE(p_comments, 'تم إرجاع طلب العرض للمراجعة'));
      END IF;

    WHEN 'escalate' THEN
      v_to_status := 'pending_approval';
      IF v_instance.current_approver_position_id IS NOT NULL THEN
        SELECT r.approver_user_id, r.approver_position_id INTO v_next_approver_uid, v_next_approver_pos
        FROM resolve_hierarchy_approver(v_instance.current_approver_position_id, v_company_id) r LIMIT 1;
      END IF;
      IF v_next_approver_uid IS NULL THEN
        SELECT ur.user_id INTO v_next_approver_uid FROM user_roles ur WHERE ur.role IN ('hr_manager', 'tenant_admin') AND ur.tenant_id = v_company_id LIMIT 1;
      END IF;
      UPDATE workflow_instances SET status = v_to_status, is_escalated = true, current_approver_id = v_next_approver_uid, current_approver_position_id = v_next_approver_pos, updated_at = now() WHERE id = p_instance_id;

    WHEN 'lock' THEN
      v_to_status := 'locked';
      UPDATE workflow_instances SET status = v_to_status, updated_at = now() WHERE id = p_instance_id;

    WHEN 'archive' THEN
      v_to_status := 'archived';
      UPDATE workflow_instances SET status = v_to_status, updated_at = now() WHERE id = p_instance_id;

    ELSE RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  -- Log action
  INSERT INTO approval_actions (instance_id, company_id, actor_user_id, action, from_status, to_status, step_order, comments, signature_data)
  VALUES (p_instance_id, v_company_id, v_actor_user_id, p_action, v_from_status, v_to_status, v_instance.current_step_order, p_comments, p_signature_data);

  -- Notify requester
  IF p_action IN ('approve', 'reject', 'return') THEN
    BEGIN
      INSERT INTO notifications (company_id, user_id, title, message, type, link)
      VALUES (v_company_id, v_instance.requester_user_id,
        CASE p_action WHEN 'approve' THEN 'تمت الموافقة على طلبك' WHEN 'reject' THEN 'تم رفض طلبك' ELSE 'تم إرجاع طلبك' END,
        v_instance.request_type, 'info', '/employee/requests');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('action', p_action, 'from_status', v_from_status, 'to_status', v_to_status, 'instance_id', p_instance_id, 'generated_doc_id', v_generated_doc_id);
END;
$$;
