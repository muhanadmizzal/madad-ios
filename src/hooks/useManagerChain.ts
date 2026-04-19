import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChainNode {
  positionId: string;
  positionTitle: string;
  employeeId?: string;
  employeeName?: string;
  avatarUrl?: string;
  departmentName?: string;
  isVacant: boolean;
}

/**
 * Fetches the full upward manager chain from a given position.
 * Walks parent_position_id until root.
 * Falls back to department.manager_position_id when parent_position_id is null.
 */
export function useManagerChain(positionId: string | null | undefined, companyId: string | null | undefined, employeeDepartmentId?: string | null) {
  return useQuery<ChainNode[]>({
    queryKey: ["manager-chain", positionId, companyId],
    queryFn: async () => {
      if (!positionId || !companyId) return [];

      const chain: ChainNode[] = [];
      const visited = new Set<string>();
      let currentParentId: string | null = null;

      // Get the starting position's parent and department
      const { data: startPos } = await supabase
        .from("positions")
        .select("parent_position_id, department_id")
        .eq("id", positionId)
        .single();

      currentParentId = startPos?.parent_position_id || null;

      // Fallback: if no parent_position_id, try department's manager_position_id
      // Use position's department_id, or employee's department as fallback
      const startDeptId = startPos?.department_id || employeeDepartmentId;
      if (!currentParentId && startDeptId) {
        const { data: dept } = await supabase
          .from("departments")
          .select("manager_position_id")
          .eq("id", startDeptId)
          .single();
        // Only use dept manager if it's not the same position (avoid self-reference)
        if (dept?.manager_position_id && dept.manager_position_id !== positionId) {
          currentParentId = dept.manager_position_id;
        }
      }

      // Walk up the chain (max 15 levels to prevent infinite loops)
      let safety = 0;
      while (currentParentId && safety < 15) {
        if (visited.has(currentParentId)) break; // prevent cycles
        visited.add(currentParentId);
        safety++;

        const { data: pos } = await supabase
          .from("positions")
          .select("id, title_ar, title_en, title, parent_position_id, department_id, departments(name)")
          .eq("id", currentParentId)
          .single();

        if (!pos) break;

        // Find assigned employee
        const { data: emp } = await supabase
          .from("employees")
          .select("id, name_ar, avatar_url")
          .eq("position_id", pos.id)
          .eq("company_id", companyId)
          .eq("status", "active")
          .maybeSingle();

        chain.push({
          positionId: pos.id,
          positionTitle: pos.title_ar || pos.title || pos.title_en || "—",
          employeeId: emp?.id,
          employeeName: emp?.name_ar,
          avatarUrl: emp?.avatar_url,
          departmentName: (pos as any).departments?.name,
          isVacant: !emp,
        });

        // Next: try parent_position_id first
        let nextId = pos.parent_position_id || null;

        // Fallback: if no parent_position_id, try department's manager_position_id
        if (!nextId && (pos as any).department_id) {
          const { data: dept } = await supabase
            .from("departments")
            .select("manager_position_id, parent_department_id")
            .eq("id", (pos as any).department_id)
            .single();

          if (dept?.manager_position_id && dept.manager_position_id !== pos.id && !visited.has(dept.manager_position_id)) {
            nextId = dept.manager_position_id;
          } else if (dept?.parent_department_id) {
            // Try parent department's manager
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

        currentParentId = nextId;
      }

      return chain;
    },
    enabled: !!positionId && !!companyId,
    staleTime: 60_000,
  });
}
