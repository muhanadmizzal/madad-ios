import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DirectManagerInfo {
  positionId: string;
  positionTitle: string;
  employeeId?: string;
  employeeName?: string;
  avatarUrl?: string;
  departmentName?: string;
  isVacant: boolean;
  /** No valid manager could be resolved at all */
  noManager: boolean;
  /** Warning message if manager link is broken */
  warning?: string;
}

/**
 * Unified hook to resolve the direct manager for a given position.
 * Resolution order:
 *   1. parent_position_id → assigned employee
 *   2. If parent vacant → still return parent position info (isVacant=true)
 *   3. If no parent_position_id → department.manager_position_id
 *   4. If still no manager → look for tenant_admin via user_roles
 * 
 * Use this EVERYWHERE a direct manager is displayed.
 */
export function useDirectManager(
  positionId: string | null | undefined,
  companyId: string | null | undefined,
  /** Optional fallback department from the employee record */
  employeeDepartmentId?: string | null
) {
  return useQuery<DirectManagerInfo>({
    queryKey: ["direct-manager", positionId, companyId],
    queryFn: async (): Promise<DirectManagerInfo> => {
      if (!positionId || !companyId) {
        return { positionId: "", positionTitle: "", isVacant: true, noManager: true, warning: "لم يتم تحديد منصب" };
      }

      // Step 1: Get position's parent and department
      const { data: pos } = await supabase
        .from("positions")
        .select("parent_position_id, department_id")
        .eq("id", positionId)
        .single();

      if (!pos) {
        return { positionId: "", positionTitle: "", isVacant: true, noManager: true, warning: "المنصب غير موجود" };
      }

      let managerPositionId: string | null = pos.parent_position_id || null;

      // Step 2: Fallback to department manager (position dept OR employee dept)
      const deptId = pos.department_id || employeeDepartmentId;
      if (!managerPositionId && deptId) {
        const { data: dept } = await supabase
          .from("departments")
          .select("manager_position_id")
          .eq("id", deptId)
          .single();
        if (dept?.manager_position_id && dept.manager_position_id !== positionId) {
          managerPositionId = dept.manager_position_id;
        }
      }

      // Step 3: If still no manager position, try to find tenant_admin
      if (!managerPositionId) {
        // Look for any position with system_role = 'tenant_admin'
        const { data: adminPos } = await supabase
          .from("positions")
          .select("id, title_ar, title, title_en, department_id, departments(name)")
          .eq("company_id", companyId)
          .eq("system_role", "tenant_admin")
          .limit(1)
          .maybeSingle();

        if (adminPos && adminPos.id !== positionId) {
          managerPositionId = adminPos.id;
        }
      }

      if (!managerPositionId) {
        return {
          positionId: "",
          positionTitle: "",
          isVacant: true,
          noManager: true,
          warning: "لم يتم ربط مدير مباشر بشكل صحيح",
        };
      }

      // Resolve manager position details
      const { data: mgrPos } = await supabase
        .from("positions")
        .select("id, title_ar, title_en, title, department_id, departments!positions_department_id_fkey(name)")
        .eq("id", managerPositionId)
        .single();

      if (!mgrPos) {
        return {
          positionId: managerPositionId,
          positionTitle: "—",
          isVacant: true,
          noManager: true,
          warning: "منصب المدير المباشر غير موجود",
        };
      }

      // Find assigned employee
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name_ar, avatar_url")
        .eq("position_id", mgrPos.id)
        .eq("company_id", companyId)
        .eq("status", "active")
        .maybeSingle();

      return {
        positionId: mgrPos.id,
        positionTitle: mgrPos.title_ar || mgrPos.title || mgrPos.title_en || "—",
        employeeId: emp?.id,
        employeeName: emp?.name_ar,
        avatarUrl: emp?.avatar_url,
        departmentName: (mgrPos as any).departments?.name,
        isVacant: !emp,
        noManager: false,
      };
    },
    enabled: !!positionId && !!companyId,
    staleTime: 60_000,
  });
}
