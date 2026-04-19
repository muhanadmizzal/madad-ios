/**
 * Shows who currently needs to approve a workflow instance.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { User, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول",
  hr_manager: "مدير HR",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  tenant_admin: "مدير المنشأة",
  super_admin: "مدير النظام",
  employee: "موظف",
};

interface Props {
  templateId: string | null;
  currentStepOrder: number;
  companyId: string;
  status: string;
  compact?: boolean;
  routingSnapshot?: {
    routing_mode?: string;
    resolved_user_id?: string;
    approver_position_id?: string;
    approver_name?: string;
    fallback_applied?: boolean;
  } | null;
}

export function CurrentApproverBadge({ templateId, currentStepOrder, companyId, status, compact, routingSnapshot }: Props) {
  const isPending = ["submitted", "pending_approval"].includes(status);

  // Get the current step's approver info
  const { data: currentStep } = useQuery({
    queryKey: ["workflow-step-approver", templateId, currentStepOrder],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("approver_role, approver_position_id, routing_mode, step_order, fallback_mode")
        .eq("template_id", templateId!)
        .eq("step_order", currentStepOrder)
        .maybeSingle();
      return data;
    },
    enabled: !!templateId && isPending,
  });

  const routingMode = routingSnapshot?.routing_mode || currentStep?.routing_mode || "role";

  // If we have a resolved user from routing snapshot, use that directly
  const snapshotResolved = routingSnapshot?.resolved_user_id;

  const { data: approvers = [] } = useQuery({
    queryKey: ["step-approvers", currentStep?.approver_role, companyId, routingMode, snapshotResolved],
    queryFn: async () => {
      // Priority 1: Use routing snapshot (position-based resolution at creation time)
      if (snapshotResolved) {
        const { data: empData } = await supabase
          .from("employees")
          .select("user_id, name_ar, name_en, position")
          .eq("user_id", snapshotResolved)
          .eq("status", "active");
        if (empData && empData.length > 0) {
          return empData.map((e: any) => ({ user_id: e.user_id, full_name: e.name_ar || e.name_en || "—", position: e.position }));
        }
        // Snapshot user no longer active, show name from snapshot
        if (routingSnapshot?.approver_name) {
          return [{ user_id: snapshotResolved, full_name: routingSnapshot.approver_name, position: null }];
        }
      }

      // Priority 2: Position-based routing from step config
      if (routingMode === "position" && currentStep?.approver_position_id) {
        const { data: empData } = await supabase
          .from("employees")
          .select("user_id, name_ar, name_en, position")
          .eq("position_id", currentStep.approver_position_id)
          .eq("company_id", companyId)
          .eq("status", "active");
        if (empData && empData.length > 0) {
          return empData.map((e: any) => ({ user_id: e.user_id, full_name: e.name_ar || e.name_en || "—", position: e.position }));
        }
        const { data: posData } = await supabase.from("positions").select("title_ar, title_en").eq("id", currentStep.approver_position_id).maybeSingle();
        return [{ user_id: null, full_name: posData?.title_ar || posData?.title_en || "منصب شاغر", position: "شاغر" }];
      }

      // Priority 3: manager_chain — resolved via routing snapshot
      if (routingMode === "manager_chain" && routingSnapshot?.approver_name) {
        return [{ user_id: routingSnapshot.resolved_user_id, full_name: routingSnapshot.approver_name, position: null }];
      }

      // Priority 4: Role-based routing
      if (!currentStep?.approver_role) return [];
      const { data: roleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", currentStep.approver_role as any)
        .eq("tenant_id", companyId);
      if (!roleUsers || roleUsers.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", roleUsers.map((r: any) => r.user_id));
      return profs || [];
    },
    enabled: !!currentStep && isPending,
  });

  if (!isPending || !currentStep) return null;

  const isVacant = routingMode === "position" && approvers.length === 1 && (approvers[0] as any)?.position === "شاغر";
  const displayLabel = routingMode === "position"
    ? (approvers[0]?.full_name || "منصب")
    : (ROLE_LABELS[currentStep.approver_role] || currentStep.approver_role);

  if (compact) {
    return (
      <Badge variant="outline" className={cn(
        "text-[10px] gap-1 whitespace-nowrap",
        isVacant
          ? "bg-accent/10 text-accent-foreground border-accent/20"
          : "bg-accent/10 text-accent-foreground border-accent/20"
      )}>
        <Clock className="h-2.5 w-2.5" />
        {displayLabel}
        {routingMode === "role" && approvers.length > 0 && ` (${approvers.map((a: any) => a.full_name).join("، ")})`}
        {isVacant && currentStep.fallback_mode && (
          <span className="opacity-60 mr-0.5">← تصعيد</span>
        )}
      </Badge>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-accent-foreground font-heading font-semibold">
        <ShieldCheck className="h-3.5 w-3.5" />
        بانتظار: {displayLabel}
      </div>
      {isVacant && currentStep.fallback_mode && (
        <div className="text-[10px] text-muted-foreground px-2">
          ⚡ المنصب شاغر — سيتم التصعيد إلى {
            currentStep.fallback_mode === "hr_manager" ? "مدير HR" :
            currentStep.fallback_mode === "tenant_admin" ? "مدير المنشأة" :
            currentStep.fallback_mode === "parent_position" ? "المنصب الأعلى" :
            currentStep.fallback_mode
          }
        </div>
      )}
      {!isVacant && approvers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {approvers.map((a: any, i: number) => (
            <div key={a.user_id || i} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-md">
              <User className="h-3 w-3 text-muted-foreground" />
              <span>{a.full_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
