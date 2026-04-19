import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HierarchyNode {
  positionId: string;
  positionTitle: string;
  employeeId?: string;
  employeeName?: string;
  avatarUrl?: string;
  departmentName?: string;
  isVacant: boolean;
}

export interface EmployeeHierarchy {
  /** Current employee info */
  employee: {
    id: string;
    name: string;
    positionId?: string;
    positionTitle?: string;
    departmentId?: string;
    departmentName?: string;
    branchName?: string;
  };
  /** Direct manager resolved from position hierarchy */
  directManager: HierarchyNode | null;
  /** Full upward chain (manager → manager → ... → root) */
  managerChain: HierarchyNode[];
  /** Direct subordinates (positions under this employee's position) */
  subordinates: {
    positionId: string;
    positionTitle: string;
    employee: { id: string; name: string; avatarUrl?: string } | null;
    isVacant: boolean;
  }[];
  /** Colleagues (same parent position, different employee) */
  colleagues: { id: string; name: string; position?: string; avatarUrl?: string }[];
  /** Warnings about hierarchy issues */
  warnings: string[];
  /** Whether manager is resolved via fallback (dept manager / admin) */
  managerFallback?: "department" | "admin";
}

/**
 * Unified hook: resolves the complete hierarchy for an employee.
 * Uses ONLY position-based hierarchy (parent_position_id), never manager_user_id.
 *
 * Resolution order for direct manager:
 *   1. employee.position_id → position.parent_position_id → assigned employee
 *   2. If parent vacant → still return position (isVacant=true), continue upward
 *   3. If no parent_position_id → department.manager_position_id
 *   4. If still none → system_role='tenant_admin' position
 *
 * Use this as the SINGLE SOURCE OF TRUTH for hierarchy everywhere.
 */
export function useEmployeeHierarchy(
  employeeId: string | null | undefined,
  companyId: string | null | undefined
) {
  return useQuery<EmployeeHierarchy | null>({
    queryKey: ["employee-hierarchy", employeeId, companyId],
    queryFn: async (): Promise<EmployeeHierarchy | null> => {
      if (!employeeId || !companyId) return null;

      // 1. Get employee
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name_ar, position_id, position, department_id, branch_id, departments(name), branches(name)")
        .eq("id", employeeId)
        .single();

      if (!emp) return null;

      const warnings: string[] = [];
      let managerFallback: "department" | "admin" | undefined;

      const hierarchy: EmployeeHierarchy = {
        employee: {
          id: emp.id,
          name: emp.name_ar || "—",
          positionId: emp.position_id || undefined,
          positionTitle: emp.position || undefined,
          departmentId: emp.department_id || undefined,
          departmentName: (emp as any).departments?.name,
          branchName: (emp as any).branches?.name,
        },
        directManager: null,
        managerChain: [],
        subordinates: [],
        colleagues: [],
        warnings,
      };

      if (!emp.position_id) {
        warnings.push("الموظف غير مرتبط بأي منصب في الهيكل التنظيمي");
        return hierarchy;
      }

      // 2. Get position details
      const { data: pos } = await supabase
        .from("positions")
        .select("id, title_ar, title, parent_position_id, department_id")
        .eq("id", emp.position_id)
        .single();

      if (!pos) {
        warnings.push("المنصب المرتبط غير موجود");
        return hierarchy;
      }

      hierarchy.employee.positionTitle = pos.title_ar || pos.title || emp.position || undefined;

      // 3. Resolve manager chain (walk upward)
      let managerPositionId: string | null = pos.parent_position_id || null;

      // Fallback: department manager
      if (!managerPositionId && pos.department_id) {
        const { data: dept } = await supabase
          .from("departments")
          .select("manager_position_id")
          .eq("id", pos.department_id)
          .single();
        if (dept?.manager_position_id && dept.manager_position_id !== emp.position_id) {
          managerPositionId = dept.manager_position_id;
          managerFallback = "department";
        }
      }

      // Fallback: tenant admin
      if (!managerPositionId) {
        const { data: adminPos } = await supabase
          .from("positions")
          .select("id")
          .eq("company_id", companyId)
          .eq("system_role", "tenant_admin")
          .neq("id", emp.position_id)
          .limit(1)
          .maybeSingle();
        if (adminPos) {
          managerPositionId = adminPos.id;
          managerFallback = "admin";
        }
      }

      if (!managerPositionId) {
        warnings.push("لم يتم ربط مدير مباشر بشكل صحيح");
      }

      // Walk chain upward
      const visited = new Set<string>();
      let currentId = managerPositionId;
      let safety = 0;

      while (currentId && safety < 15) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        safety++;

        const { data: mgrPos } = await supabase
          .from("positions")
          .select("id, title_ar, title, parent_position_id, department_id, departments!positions_department_id_fkey(name)")
          .eq("id", currentId)
          .single();

        if (!mgrPos) break;

        const { data: mgrEmp } = await supabase
          .from("employees")
          .select("id, name_ar, avatar_url")
          .eq("position_id", mgrPos.id)
          .eq("company_id", companyId)
          .eq("status", "active")
          .maybeSingle();

        const node: HierarchyNode = {
          positionId: mgrPos.id,
          positionTitle: mgrPos.title_ar || mgrPos.title || "—",
          employeeId: mgrEmp?.id,
          employeeName: mgrEmp?.name_ar,
          avatarUrl: mgrEmp?.avatar_url,
          departmentName: (mgrPos as any).departments?.name,
          isVacant: !mgrEmp,
        };

        hierarchy.managerChain.push(node);

        // Next parent
        let nextId = mgrPos.parent_position_id || null;
        if (!nextId && mgrPos.department_id) {
          const { data: dept } = await supabase
            .from("departments")
            .select("manager_position_id, parent_department_id")
            .eq("id", mgrPos.department_id)
            .single();
          if (dept?.manager_position_id && dept.manager_position_id !== mgrPos.id && !visited.has(dept.manager_position_id)) {
            nextId = dept.manager_position_id;
          } else if (dept?.parent_department_id) {
            const { data: parentDept } = await supabase
              .from("departments")
              .select("manager_position_id")
              .eq("id", dept.parent_department_id)
              .single();
            if (parentDept?.manager_position_id && !visited.has(parentDept.manager_position_id)) {
              nextId = parentDept.manager_position_id;
            }
          }
        }
        currentId = nextId;
      }

      // Direct manager = first in chain
      hierarchy.directManager = hierarchy.managerChain[0] || null;
      hierarchy.managerFallback = managerFallback;

      // 4. Get subordinates (direct reports)
      const { data: childPositions } = await supabase
        .from("positions")
        .select("id, title_ar, title, status")
        .eq("parent_position_id", emp.position_id)
        .eq("company_id", companyId);

      if (childPositions?.length) {
        const childPosIds = childPositions.map((p: any) => p.id);
        const { data: subEmps } = await supabase
          .from("employees")
          .select("id, name_ar, avatar_url, position_id")
          .in("position_id", childPosIds)
          .eq("status", "active");

        hierarchy.subordinates = childPositions.map((cp: any) => {
          const subEmp = subEmps?.find((e: any) => e.position_id === cp.id);
          return {
            positionId: cp.id,
            positionTitle: cp.title_ar || cp.title || "—",
            employee: subEmp ? { id: subEmp.id, name: subEmp.name_ar || "—", avatarUrl: subEmp.avatar_url } : null,
            isVacant: !subEmp,
          };
        });
      }

      // 5. Get colleagues (sibling positions)
      if (pos.parent_position_id) {
        const { data: siblings } = await supabase
          .from("positions")
          .select("id")
          .eq("parent_position_id", pos.parent_position_id)
          .eq("company_id", companyId)
          .neq("id", emp.position_id);

        if (siblings?.length) {
          const sibIds = siblings.map((s: any) => s.id);
          const { data: colEmps } = await supabase
            .from("employees")
            .select("id, name_ar, position, avatar_url")
            .in("position_id", sibIds)
            .eq("status", "active")
            .limit(10);
          hierarchy.colleagues = (colEmps || []).map((c: any) => ({
            id: c.id,
            name: c.name_ar || "—",
            position: c.position,
            avatarUrl: c.avatar_url,
          }));
        }
      }

      return hierarchy;
    },
    enabled: !!employeeId && !!companyId,
    staleTime: 60_000,
  });
}
