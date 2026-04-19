
-- Update generate_tenant_invoice to use the basket billing model
CREATE OR REPLACE FUNCTION public.generate_tenant_invoice(
  p_company_id UUID,
  p_billing_period TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_bill jsonb;
  v_items jsonb;
  v_total numeric;
  v_invoice_id uuid;
  v_invoice_number text;
  v_due_date date;
  v_item jsonb;
  v_currency text;
  v_period text;
  v_existing_id uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT (has_role(v_actor, 'super_admin') OR has_role(v_actor, 'business_admin') OR has_role(v_actor, 'finance_manager')) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  v_period := COALESCE(p_billing_period, to_char(CURRENT_DATE, 'YYYY-MM'));

  -- Idempotency check
  SELECT id INTO v_existing_id FROM billing_invoices 
    WHERE company_id = p_company_id AND billing_period = v_period AND status != 'cancelled';
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice already exists for this period', 'existing_invoice_id', v_existing_id);
  END IF;

  -- Use the basket bill (à la carte features + AI tools)
  v_bill := calculate_basket_bill(p_company_id);
  v_items := v_bill->'items';
  v_total := (v_bill->>'total')::numeric;
  v_currency := COALESCE(v_bill->>'currency', 'USD');

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No billable amount');
  END IF;

  v_invoice_number := 'INV-' || replace(v_period, '-', '') || '-' || LPAD(floor(random() * 9999 + 1)::text, 4, '0');
  v_due_date := (CURRENT_DATE + interval '30 days')::date;

  INSERT INTO billing_invoices (company_id, invoice_number, amount, currency, status, due_date, billing_period)
  VALUES (p_company_id, v_invoice_number, v_total, v_currency, 'pending', v_due_date, v_period)
  RETURNING id INTO v_invoice_id;

  -- Insert line items from basket
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO invoice_items (invoice_id, item_type, description, amount, quantity)
    VALUES (
      v_invoice_id,
      COALESCE(v_item->>'pricing_type', 'flat'),
      COALESCE(v_item->>'description', v_item->>'feature_key'),
      (v_item->>'amount')::numeric,
      COALESCE((v_item->>'quantity')::int, 1)
    );
  END LOOP;

  INSERT INTO business_audit_logs (actor_user_id, action, target_type, target_id, tenant_id, after_state)
  VALUES (v_actor, 'invoice_generated', 'billing_invoice', v_invoice_id::text, p_company_id,
    jsonb_build_object('invoice_number', v_invoice_number, 'amount', v_total, 'period', v_period));

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number, 'amount', v_total, 'period', v_period);
END;
$$;
