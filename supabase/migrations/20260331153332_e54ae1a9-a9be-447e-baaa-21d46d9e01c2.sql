CREATE OR REPLACE FUNCTION public.transfer_employee_position(
  p_employee_id uuid,
  p_new_position_id uuid,
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_emp record;
  v_new_pos record;
  v_old_position_id uuid;
  v_old_department_id uuid;
  v_old_branch_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get employee current state
  SELECT id, position_id, department_id, branch_id, company_id, name_ar, position
  INTO v_emp FROM employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- Get new position details
  SELECT p.id, p.department_id, p.status, p.company_id, p.title_ar, p.title,
         d.branch_id as dept_branch_id, d.name as dept_name
  INTO v_new_pos
  FROM positions p
  LEFT JOIN departments d ON d.id = p.department_id
  WHERE p.id = p_new_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position not found';
  END IF;

  IF v_new_pos.company_id != v_emp.company_id THEN
    RAISE EXCEPTION 'Cannot transfer across companies';
  END IF;

  -- Store old values
  v_old_position_id := v_emp.position_id;
  v_old_department_id := v_emp.department_id;
  v_old_branch_id := v_emp.branch_id;

  -- Vacate old position if exists
  IF v_old_position_id IS NOT NULL THEN
    UPDATE positions SET status = 'vacant' WHERE id = v_old_position_id;
  END IF;

  -- Update employee
  UPDATE employees SET
    position_id = p_new_position_id,
    department_id = v_new_pos.department_id,
    branch_id = COALESCE(v_new_pos.dept_branch_id, v_emp.branch_id),
    position = COALESCE(v_new_pos.title_ar, v_new_pos.title, v_emp.position)
  WHERE id = p_employee_id;

  -- Fill new position
  UPDATE positions SET status = 'filled' WHERE id = p_new_position_id;

  -- Career history record
  INSERT INTO career_history (company_id, employee_id, event_type, effective_date,
    from_position, to_position, from_department, to_department, notes)
  VALUES (
    v_emp.company_id, p_employee_id, 'transfer', CURRENT_DATE,
    v_emp.position, COALESCE(v_new_pos.title_ar, v_new_pos.title),
    v_old_department_id::text, v_new_pos.department_id::text,
    p_reason
  );

  -- Audit log (record_id is UUID — pass UUID directly, no cast)
  INSERT INTO audit_logs (company_id, table_name, record_id, action, user_id, old_values, new_values)
  VALUES (v_emp.company_id, 'employees', p_employee_id, 'transfer', v_user_id,
    jsonb_build_object('position_id', v_old_position_id, 'department_id', v_old_department_id, 'branch_id', v_old_branch_id),
    jsonb_build_object('position_id', p_new_position_id, 'department_id', v_new_pos.department_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', p_employee_id,
    'old_position_id', v_old_position_id,
    'new_position_id', p_new_position_id,
    'new_department_id', v_new_pos.department_id
  );
END;
$function$;