import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export async function logBusinessAction(
  action: string,
  targetType: string,
  targetId?: string,
  tenantId?: string,
  beforeState?: any,
  afterState?: any,
  metadata?: any
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("business_audit_logs").insert({
    actor_user_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId || null,
    tenant_id: tenantId || null,
    before_state: beforeState || null,
    after_state: afterState || null,
    metadata: metadata || null,
  } as any);
}
