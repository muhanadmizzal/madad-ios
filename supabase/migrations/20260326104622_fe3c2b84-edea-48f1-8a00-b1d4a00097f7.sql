
-- Add system_role column to positions table
-- This determines what tenant-level role employees at this position automatically receive
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS system_role text DEFAULT 'employee';

-- Create a function to auto-sync user_roles when employee is assigned to a position
CREATE OR REPLACE FUNCTION public.sync_role_from_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _position_role text;
  _company_id uuid;
BEGIN
  -- Only process if position_id changed and user_id is set
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.position_id IS NOT NULL AND (OLD.position_id IS DISTINCT FROM NEW.position_id) THEN
    -- Get the system_role from the position
    SELECT system_role, company_id INTO _position_role, _company_id
    FROM public.positions
    WHERE id = NEW.position_id;

    IF _position_role IS NOT NULL THEN
      -- Remove existing tenant-level roles for this user in this company
      DELETE FROM public.user_roles
      WHERE user_id = NEW.user_id
        AND role IN ('tenant_admin', 'admin', 'hr_manager', 'hr_officer', 'manager', 'employee')
        AND scope_type = 'tenant'
        AND tenant_id = _company_id;

      -- Insert the new role from the position
      INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
      VALUES (NEW.user_id, _position_role::app_role, 'tenant', _company_id)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on employees table
DROP TRIGGER IF EXISTS trg_sync_role_from_position ON public.employees;
CREATE TRIGGER trg_sync_role_from_position
  AFTER INSERT OR UPDATE OF position_id ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_from_position();

-- Also create a function to sync when position's system_role changes
CREATE OR REPLACE FUNCTION public.sync_roles_on_position_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp RECORD;
BEGIN
  IF OLD.system_role IS DISTINCT FROM NEW.system_role THEN
    -- Update all employees assigned to this position
    FOR _emp IN
      SELECT user_id, company_id FROM public.employees
      WHERE position_id = NEW.id AND user_id IS NOT NULL AND status = 'active'
    LOOP
      -- Remove old tenant-level role
      DELETE FROM public.user_roles
      WHERE user_id = _emp.user_id
        AND role IN ('tenant_admin', 'admin', 'hr_manager', 'hr_officer', 'manager', 'employee')
        AND scope_type = 'tenant'
        AND tenant_id = _emp.company_id;

      -- Insert new role
      INSERT INTO public.user_roles (user_id, role, scope_type, tenant_id)
      VALUES (_emp.user_id, NEW.system_role::app_role, 'tenant', _emp.company_id)
      ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_roles_on_position_role_change ON public.positions;
CREATE TRIGGER trg_sync_roles_on_position_role_change
  AFTER UPDATE OF system_role ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_roles_on_position_role_change();
