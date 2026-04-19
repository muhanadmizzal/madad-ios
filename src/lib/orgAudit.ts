import { supabase } from "@/integrations/supabase/client";

/**
 * Log an org-chart mutation to the audit_logs table.
 * Fire-and-forget — never blocks the caller.
 */
export async function logOrgAudit(
  companyId: string,
  action: "INSERT" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string,
  oldValues?: Record<string, any> | null,
  newValues?: Record<string, any> | null,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      action,
      table_name: tableName,
      record_id: recordId,
      user_id: user.id,
      old_values: oldValues || null,
      new_values: newValues || null,
    });
  } catch {
    // Silent — audit logging should never break the flow
  }
}
