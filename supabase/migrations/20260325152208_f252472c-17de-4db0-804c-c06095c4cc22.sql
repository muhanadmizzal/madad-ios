
-- Add position-aware routing columns to workflow_steps
ALTER TABLE public.workflow_steps
  ADD COLUMN IF NOT EXISTS approver_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routing_mode text NOT NULL DEFAULT 'role',
  ADD COLUMN IF NOT EXISTS fallback_mode text DEFAULT 'hr_manager',
  ADD COLUMN IF NOT EXISTS skip_if_position_vacant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsibility_key text,
  ADD COLUMN IF NOT EXISTS department_scope boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add comments
COMMENT ON COLUMN public.workflow_steps.routing_mode IS 'role | position | manager_chain | workflow_responsibility | hr_owner | finance_owner | tenant_admin';
COMMENT ON COLUMN public.workflow_steps.fallback_mode IS 'parent_position | department_manager | hr_manager | tenant_admin | none';
COMMENT ON COLUMN public.workflow_steps.skip_if_position_vacant IS 'If true, step is auto-skipped when target position has no assignee';
COMMENT ON COLUMN public.workflow_steps.responsibility_key IS 'Optional key to match positions with workflow_responsibility flags';
COMMENT ON COLUMN public.workflow_steps.department_scope IS 'If true, routing is scoped to the requester department';
