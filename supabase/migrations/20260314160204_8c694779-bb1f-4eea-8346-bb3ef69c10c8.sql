
-- Create trigger to auto-deduct leave balance when leave is approved
CREATE OR REPLACE FUNCTION public.handle_leave_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  leave_days numeric;
  v_year integer;
BEGIN
  -- Only fire when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    leave_days := (NEW.end_date - NEW.start_date) + 1;
    IF NEW.is_half_day = true THEN
      leave_days := 0.5;
    END IF;
    
    v_year := EXTRACT(year FROM NEW.start_date);
    
    UPDATE public.leave_balances
    SET used_days = used_days + leave_days,
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = v_year;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_leave_approved
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_leave_approval();
