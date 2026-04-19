import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Unified transfer/reassignment hook.
 * ALL employee moves — from drawer, profile, or transfer screen — must use this.
 * Calls the `transfer_employee_position` RPC which atomically updates:
 *   - employee record (position_id, department_id, branch_id)
 *   - old position → vacant
 *   - new position → filled
 *   - career_history record
 *   - hierarchy / parent_position_id links
 *   - workflow routing recalculation
 */
export function useTransferEmployee() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      newPositionId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("transfer_employee_position", {
        p_employee_id: params.employeeId,
        p_new_position_id: params.newPositionId,
        p_reason: params.reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "تم نقل الموظف بنجاح", description: "تم تحديث المنصب والقسم والفرع والصلاحيات تلقائياً" });
      // Invalidate ALL related queries to ensure cross-view consistency
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      qc.invalidateQueries({ queryKey: ["org-employees"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["drawer-employees"] });
      qc.invalidateQueries({ queryKey: ["drawer-subordinates"] });
      qc.invalidateQueries({ queryKey: ["manager-chain"] });
      qc.invalidateQueries({ queryKey: ["direct-manager"] });
      qc.invalidateQueries({ queryKey: ["employee-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["emp-position"] });
      qc.invalidateQueries({ queryKey: ["emp-subordinates"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["org-chart-data"] });
      qc.invalidateQueries({ queryKey: ["my-employee"] });
      qc.invalidateQueries({ queryKey: ["my-position-detail"] });
      qc.invalidateQueries({ queryKey: ["my-colleagues"] });
    },
    onError: (e: any) => {
      toast({ title: "خطأ في النقل", description: e.message, variant: "destructive" });
    },
  });
}
