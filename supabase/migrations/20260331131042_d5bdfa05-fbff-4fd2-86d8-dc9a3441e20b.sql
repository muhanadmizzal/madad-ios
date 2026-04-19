
-- ========== PART 1: Support Messages Table ==========
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL DEFAULT 'tenant',
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tenant users can view messages for their company's tickets
CREATE POLICY "View own company ticket messages" ON public.support_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = support_messages.ticket_id
    AND st.company_id = public.get_my_company_id()
  )
);

-- Tenant users can insert messages on their own company tickets
CREATE POLICY "Insert messages on own tickets" ON public.support_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = support_messages.ticket_id
    AND st.company_id = public.get_my_company_id()
  )
);

-- Super admins / business admins can manage all messages
CREATE POLICY "Business admins manage all messages" ON public.support_messages
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Business admin role messages" ON public.support_messages
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'business_admin'::app_role));

CREATE POLICY "Support agent messages" ON public.support_messages
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'support_agent'::app_role));

-- Add category column to support_tickets if missing
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

-- Enable realtime for support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- ========== PART 2: Invoice Payment Columns ==========
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS payment_proof text;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS verified_by uuid;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON public.support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_payment_status ON public.billing_invoices(payment_status);
