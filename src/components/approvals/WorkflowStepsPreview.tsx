/**
 * Compact workflow steps preview — shows the approval chain with current step highlighted.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, ShieldCheck, SkipForward, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  hr_manager: "مدير HR",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  tenant_admin: "مدير المنشأة",
  finance_manager: "مدير مالي",
  employee: "موظف",
};

const ROUTING_LABELS: Record<string, string> = {
  role: "دور",
  position: "منصب",
  manager_chain: "سلسلة المدير",
  hr_owner: "HR",
  finance_owner: "مالية",
  tenant_admin: "مدير المنشأة",
};

interface Props {
  templateId: string | null;
  currentStepOrder: number;
  status: string;
  instanceId?: string;
}

export function WorkflowStepsPreview({ templateId, currentStepOrder, status, instanceId }: Props) {
  const isPending = ["submitted", "pending_approval"].includes(status);

  const { data: steps = [] } = useQuery({
    queryKey: ["workflow-steps-preview", templateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("template_id", templateId!)
        .order("step_order", { ascending: true });
      return data || [];
    },
    enabled: !!templateId,
  });

  // Get completed actions to mark completed steps
  const { data: actions = [] } = useQuery({
    queryKey: ["workflow-step-actions", instanceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_actions")
        .select("step_order, action")
        .eq("instance_id", instanceId!);
      return data || [];
    },
    enabled: !!instanceId,
  });

  if (steps.length === 0) return null;

  const completedSteps = new Set(
    actions.filter((a: any) => a.action === "approve").map((a: any) => a.step_order)
  );
  const skippedSteps = new Set(
    actions.filter((a: any) => a.action === "skip").map((a: any) => a.step_order)
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-heading font-medium text-muted-foreground">مراحل الاعتماد</p>
      <div className="flex flex-wrap gap-1.5">
        {steps.map((step: any, idx: number) => {
          const isCompleted = completedSteps.has(step.step_order);
          const isSkipped = skippedSteps.has(step.step_order);
          const isCurrent = isPending && step.step_order === currentStepOrder;
          const routingMode = step.routing_mode || "role";
          const label = routingMode === "role"
            ? (ROLE_LABELS[step.approver_role] || step.approver_role)
            : (ROUTING_LABELS[routingMode] || routingMode);

          return (
            <div key={step.id} className="flex items-center gap-1">
              {idx > 0 && <ArrowLeft className="h-2.5 w-2.5 text-muted-foreground/30 rotate-180" />}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border transition-all",
                isCompleted && "bg-primary/10 text-primary border-primary/20",
                isSkipped && "bg-muted text-muted-foreground border-border line-through opacity-60",
                isCurrent && "bg-accent/10 text-accent-foreground border-accent/30 ring-1 ring-accent/20",
                !isCompleted && !isCurrent && !isSkipped && "bg-muted/50 text-muted-foreground border-border",
              )}>
                {isCompleted && <CheckCircle className="h-2.5 w-2.5" />}
                {isSkipped && <SkipForward className="h-2.5 w-2.5" />}
                {isCurrent && <Clock className="h-2.5 w-2.5 animate-pulse" />}
                {!isCompleted && !isCurrent && !isSkipped && <ShieldCheck className="h-2.5 w-2.5 opacity-40" />}
                <span className="font-heading">{step.step_order}.</span>
                <span>{label}</span>
                {step.is_optional && <span className="opacity-50">(اختياري)</span>}
                {step.skip_if_position_vacant && <span className="opacity-50">⚡</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
