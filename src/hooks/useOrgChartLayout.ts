import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Node } from "@xyflow/react";

export type LayoutMode = "auto" | "free";

export function useOrgChartLayout(companyId: string | undefined) {
  const qc = useQueryClient();
  const pendingSaves = useRef<Map<string, { x: number; y: number }>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch save node positions (debounced)
  const flushSaves = useCallback(async () => {
    if (!pendingSaves.current.size) return;
    const entries = Array.from(pendingSaves.current.entries());
    pendingSaves.current.clear();

    const posUpdates = entries.filter(([id]) => id.startsWith("pos-"));
    const deptUpdates = entries.filter(([id]) => id.startsWith("dept-"));

    const promises: PromiseLike<any>[] = [];

    for (const [id, { x, y }] of posUpdates) {
      const realId = id.replace("pos-", "");
      promises.push(
        supabase.from("positions").update({ diagram_x: x, diagram_y: y } as any).eq("id", realId).then()
      );
    }
    for (const [id, { x, y }] of deptUpdates) {
      const realId = id.replace("dept-", "");
      promises.push(
        supabase.from("departments").update({ diagram_x: x, diagram_y: y } as any).eq("id", realId).then()
      );
    }

    await Promise.all(promises);
  }, []);

  const saveNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    if (nodeId === "company") return; // Don't save company node
    pendingSaves.current.set(nodeId, { x, y });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushSaves();
    }, 800);
  }, [flushSaves]);

  // Reset layout for all nodes
  const resetLayoutMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      await Promise.all([
        supabase.from("positions").update({ diagram_x: null, diagram_y: null } as any).eq("company_id", companyId),
        supabase.from("departments").update({ diagram_x: null, diagram_y: null } as any).eq("company_id", companyId),
      ]);
    },
    onSuccess: () => {
      toast({ title: "تم إعادة تعيين التخطيط" });
      qc.invalidateQueries({ queryKey: ["org-positions", companyId] });
      qc.invalidateQueries({ queryKey: ["org-departments", companyId] });
    },
  });

  // Check if any node has saved positions (= free layout was used)
  const hasSavedPositions = useCallback((positions: any[], departments: any[]) => {
    return positions.some((p: any) => p.diagram_x != null) || departments.some((d: any) => d.diagram_x != null);
  }, []);

  // Apply saved positions to nodes
  const applySavedPositions = useCallback((nodes: Node[], positions: any[], departments: any[]): Node[] => {
    const posMap = new Map(positions.map((p: any) => [p.id, p]));
    const deptMap = new Map(departments.map((d: any) => [d.id, d]));

    return nodes.map(node => {
      if (node.id.startsWith("pos-")) {
        const pos = posMap.get(node.id.replace("pos-", ""));
        if (pos?.diagram_x != null && pos?.diagram_y != null) {
          return { ...node, position: { x: pos.diagram_x, y: pos.diagram_y } };
        }
      } else if (node.id.startsWith("dept-")) {
        const dept = deptMap.get(node.id.replace("dept-", ""));
        if (dept?.diagram_x != null && dept?.diagram_y != null) {
          return { ...node, position: { x: dept.diagram_x, y: dept.diagram_y } };
        }
      }
      return node;
    });
  }, []);

  return {
    saveNodePosition,
    resetLayout: () => resetLayoutMutation.mutate(),
    isResetting: resetLayoutMutation.isPending,
    hasSavedPositions,
    applySavedPositions,
    flushSaves,
  };
}
