
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;

CREATE OR REPLACE FUNCTION public.reparent_department(
  p_department_id UUID,
  p_new_parent_department_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_department_id = p_new_parent_department_id THEN
    RAISE EXCEPTION 'Cannot parent department to itself';
  END IF;
  
  UPDATE departments
  SET parent_department_id = p_new_parent_department_id,
      updated_at = now()
  WHERE id = p_department_id;
END;
$$;
