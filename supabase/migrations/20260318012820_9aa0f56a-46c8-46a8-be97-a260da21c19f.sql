
CREATE OR REPLACE FUNCTION public.sync_generated_document_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When a workflow for a generated document is approved/rejected
  IF NEW.request_type = 'generated_document' AND NEW.status IN ('approved', 'rejected', 'returned') THEN
    UPDATE generated_documents SET
      status = CASE NEW.status
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'draft'
        WHEN 'returned' THEN 'draft'
      END,
      visibility_scope = CASE WHEN NEW.status = 'approved' THEN 'employee' ELSE visibility_scope END,
      approved_by = CASE WHEN NEW.status = 'approved' THEN (
        SELECT actor_user_id FROM approval_actions WHERE instance_id = NEW.id ORDER BY created_at DESC LIMIT 1
      ) ELSE approved_by END,
      approved_at = CASE WHEN NEW.status = 'approved' THEN now() ELSE approved_at END,
      is_immutable = CASE WHEN NEW.status = 'approved' THEN true ELSE false END,
      updated_at = now()
    WHERE id = NEW.reference_id::uuid;
  END IF;
  RETURN NEW;
END;
$function$;
