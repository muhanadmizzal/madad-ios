
-- ═══ 1. Transfer Employee Position RPC with cascading updates ═══
CREATE OR REPLACE FUNCTION public.transfer_employee_position(
  p_employee_id uuid,
  p_new_position_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT id, position_id, department_id, branch_id, company_id, name_ar
  INTO v_emp FROM employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- Get new position details
  SELECT p.id, p.department_id, p.status, p.company_id,
         d.branch_id as dept_branch_id
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

  -- Store old values for audit
  v_old_position_id := v_emp.position_id;
  v_old_department_id := v_emp.department_id;
  v_old_branch_id := v_emp.branch_id;

  -- Vacate old position if exists
  IF v_old_position_id IS NOT NULL THEN
    UPDATE positions SET status = 'vacant' WHERE id = v_old_position_id;
  END IF;

  -- Update employee: position, department, branch all cascaded
  UPDATE employees SET
    position_id = p_new_position_id,
    department_id = v_new_pos.department_id,
    branch_id = COALESCE(v_new_pos.dept_branch_id, v_emp.branch_id)
  WHERE id = p_employee_id;

  -- Fill new position
  UPDATE positions SET status = 'filled' WHERE id = p_new_position_id;

  -- Audit log
  INSERT INTO audit_logs (company_id, table_name, record_id, action, user_id, old_values, new_values)
  VALUES (v_emp.company_id, 'employees', p_employee_id::text, 'transfer', v_user_id,
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
$$;

-- ═══ 2. Circular hierarchy prevention for positions ═══
CREATE OR REPLACE FUNCTION public.check_position_circular_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_current uuid;
  v_depth int := 0;
BEGIN
  IF NEW.parent_position_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_position_id = NEW.id THEN
    RAISE EXCEPTION 'Position cannot be its own parent';
  END IF;

  v_current := NEW.parent_position_id;
  WHILE v_current IS NOT NULL AND v_depth < 50 LOOP
    IF v_current = NEW.id THEN
      RAISE EXCEPTION 'Circular hierarchy detected';
    END IF;
    SELECT parent_position_id INTO v_current FROM positions WHERE id = v_current;
    v_depth := v_depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_position_circular ON positions;
CREATE TRIGGER trg_check_position_circular
  BEFORE INSERT OR UPDATE OF parent_position_id ON positions
  FOR EACH ROW EXECUTE FUNCTION check_position_circular_ref();

-- ═══ 3. Circular hierarchy prevention for departments ═══
CREATE OR REPLACE FUNCTION public.check_department_circular_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_current uuid;
  v_depth int := 0;
BEGIN
  IF NEW.parent_department_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_department_id = NEW.id THEN
    RAISE EXCEPTION 'Department cannot be its own parent';
  END IF;

  v_current := NEW.parent_department_id;
  WHILE v_current IS NOT NULL AND v_depth < 50 LOOP
    IF v_current = NEW.id THEN
      RAISE EXCEPTION 'Circular hierarchy detected';
    END IF;
    SELECT parent_department_id INTO v_current FROM departments WHERE id = v_current;
    v_depth := v_depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_dept_circular ON departments;
CREATE TRIGGER trg_check_dept_circular
  BEFORE INSERT OR UPDATE OF parent_department_id ON departments
  FOR EACH ROW EXECUTE FUNCTION check_department_circular_ref();

-- ═══ 4. Initialize leave balances based on hire date and accrual ═══
CREATE OR REPLACE FUNCTION public.initialize_employee_leave_balances(
  p_employee_id uuid,
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp record;
  v_lt record;
  v_current_year int;
  v_hire_date date;
  v_months_in_year numeric;
  v_prorated_days numeric;
  v_carried_days numeric;
BEGIN
  v_current_year := EXTRACT(YEAR FROM now());
  
  SELECT hire_date INTO v_hire_date FROM employees WHERE id = p_employee_id;
  
  FOR v_lt IN SELECT * FROM leave_types WHERE company_id = p_company_id LOOP
    -- Calculate prorated entitlement based on hire date
    v_prorated_days := v_lt.days_allowed;
    
    IF v_hire_date IS NOT NULL AND EXTRACT(YEAR FROM v_hire_date) = v_current_year THEN
      -- New hire this year: prorate based on remaining months
      v_months_in_year := 12 - EXTRACT(MONTH FROM v_hire_date) + 1;
      v_prorated_days := ROUND((v_lt.days_allowed::numeric / 12) * v_months_in_year, 1);
    END IF;

    -- Check carry-over from previous year
    v_carried_days := 0;
    IF v_lt.allow_carry_over THEN
      SELECT GREATEST(0, LEAST(
        (entitled_days + carried_days - used_days),
        COALESCE(v_lt.max_carry_days, 999)
      ))
      INTO v_carried_days
      FROM leave_balances
      WHERE employee_id = p_employee_id
        AND leave_type_id = v_lt.id
        AND year = v_current_year - 1;
      
      v_carried_days := COALESCE(v_carried_days, 0);
    END IF;

    INSERT INTO leave_balances (company_id, employee_id, leave_type_id, year, entitled_days, used_days, carried_days)
    VALUES (p_company_id, p_employee_id, v_lt.id, v_current_year, v_prorated_days, 0, v_carried_days)
    ON CONFLICT (employee_id, leave_type_id, year)
    DO UPDATE SET entitled_days = EXCLUDED.entitled_days, carried_days = EXCLUDED.carried_days;
  END LOOP;
END;
$$;

-- ═══ 5. Auto-initialize balances when employee is created ═══
CREATE OR REPLACE FUNCTION public.auto_init_leave_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM initialize_employee_leave_balances(NEW.id, NEW.company_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_init_leave_balances ON employees;
CREATE TRIGGER trg_auto_init_leave_balances
  AFTER INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION auto_init_leave_balances();
