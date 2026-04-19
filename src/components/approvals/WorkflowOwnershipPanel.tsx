/**
 * WorkflowOwnershipPanel — Shows which workflows a position is responsible for
 * in the Org Chart detail drawer.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Workflow, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { requestTypeLabels } from "@/hooks/useApprovalWorkflow";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  hr_manager: "مدير HR",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  tenant_admin: "مدير المنشأة",
  finance_manager: "مدير مالي",
};

interface Props {
  positionId: string;
  companyId: string;
}

export function WorkflowOwnershipPanel({ positionId, companyId }: Props) {
  // Find workflow steps that route to this position
  const { data: positionSteps = [] } = useQuery({
    queryKey: ["workflow-ownership", positionId, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("*, workflow_templates!inner(name, request_type, is_active, company_id)")
        .eq("approver_position_id", positionId)
        .eq("routing_mode", "position") as any;
      // Filter by company
      return (data || []).filter((s: any) => s.workflow_templates?.company_id === companyId);
    },
    enabled: !!positionId && !!companyId,
  });

  // Also find role-based steps that match this position's assigned user's role
  // (simplified: just show position-routed steps for now)

  // Find pending instances where this position is current approver
  const { data: pendingInstances = [] } = useQuery({
    queryKey: ["position-pending-approvals", positionId, companyId],
    queryFn: async () => {
      if (positionSteps.length === 0) return [];
      const templateIds = [...new Set(positionSteps.map((s: any) => s.template_id))] as string[];
      const { data } = await supabase
        .from("workflow_instances")
        .select("id, request_type, status, current_step_order, template_id")
        .eq("company_id", companyId)
        .in("status", ["submitted", "pending_approval"])
        .in("template_id", templateIds);
      // Filter to instances where current step matches one of this position's steps
      return (data || []).filter((inst: any) => {
        return positionSteps.some((s: any) =>
          s.template_id === inst.template_id && s.step_order === inst.current_step_order
        );
      });
    },
    enabled: positionSteps.length > 0,
  });

  if (positionSteps.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-heading font-semibold text-sm flex items-center gap-2">
        <Workflow className="h-4 w-4 text-accent" />
        مسؤوليات سير العمل
      </h4>
      <div className="space-y-2">
        {positionSteps.map((step: any) => (
          <div key={step.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-heading font-medium">
                {step.workflow_templates?.name}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                مرحلة {step.step_order}
              </Badge>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {requestTypeLabels[step.workflow_templates?.request_type] || step.workflow_templates?.request_type}
            </Badge>
          </div>
        ))}
      </div>

      {pendingInstances.length > 0 && (
        <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-2 text-xs font-heading font-semibold text-accent-foreground">
            <Clock className="h-3.5 w-3.5" />
            {pendingInstances.length} طلب بانتظار الموافقة من هذا المنصب
          </div>
        </div>
      )}
    </div>
  );
}
