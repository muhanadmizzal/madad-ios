
-- Trigger function to auto-assign onboarding templates to new employees
CREATE OR REPLACE FUNCTION public.auto_assign_onboarding_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO onboarding_tasks (company_id, employee_id, title, description, task_type)
  SELECT NEW.company_id, NEW.id, t.title, t.description, t.task_type
  FROM onboarding_templates t
  WHERE t.company_id = NEW.company_id AND t.is_active = true
  ORDER BY t.sort_order;
  
  RETURN NEW;
END;
$$;

-- Create trigger on employees table
DROP TRIGGER IF EXISTS trg_auto_onboarding ON employees;
CREATE TRIGGER trg_auto_onboarding
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_onboarding_tasks();
