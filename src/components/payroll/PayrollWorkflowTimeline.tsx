/**
 * Payroll Workflow Timeline — shows the approval chain and current approver.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYROLL_STATUS_MAP } from "@/lib/roles";
import { CheckCircle, Clock, XCircle, RotateCcw, Lock, FileEdit, ArrowLeft, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  FileEdit, Clock, CheckCircle, XCircle, RotateCcw, Lock,
};

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول",
  hr_manager: "مدير الموارد البشرية",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  tenant_admin: "مدير المنشأة",
  super_admin: "مدير النظام",
  employee: "موظف",
};

interface Props {
  payrollRunId: string;
  currentStatus: string;
  companyId: string;
}

export function PayrollWorkflowTimeline({ payrollRunId, currentStatus, companyId }: Props) {
  const statusMeta = PAYROLL_STATUS_MAP[currentStatus] || PAYROLL_STATUS_MAP.draft;
  const StatusIcon = ICON_MAP[statusMeta.icon] || Clock;

  // Get workflow instance
  const { data: workflowInstance } = useQuery({
    queryKey: ["payroll-workflow-instance", payrollRunId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("reference_id", payrollRunId)
        .eq("request_type", "payroll")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!payrollRunId,
  });

  // Get workflow steps (the approval chain)
  const { data: workflowSteps = [] } = useQuery({
    queryKey: ["payroll-workflow-steps", workflowInstance?.template_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("template_id", workflowInstance!.template_id!)
        .order("step_order", { ascending: true });
      return data || [];
    },
    enabled: !!workflowInstance?.template_id,
  });

  // Get approval actions
  const { data: approvalActions = [] } = useQuery({
    queryKey: ["payroll-approval-actions", workflowInstance?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_actions")
        .select("*")
        .eq("instance_id", workflowInstance!.id)
        .order("created_at", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!workflowInstance?.id,
  });

  // Get actor profiles
  const actorIds = [...new Set(approvalActions.map((a) => a.actor_user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["payroll-actors", actorIds],
    queryFn: async () => {
      if (actorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", actorIds);
      return data || [];
    },
    enabled: actorIds.length > 0,
  });

  // Get current step approver users (who needs to act now)
  const currentStep = workflowSteps.find((s: any) => s.step_order === (workflowInstance?.current_step_order || 1));
  const isPending = ["submitted", "pending_approval"].includes(workflowInstance?.status || currentStatus);

  const { data: currentApprovers = [] } = useQuery({
    queryKey: ["payroll-current-approvers", currentStep?.approver_role, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", currentStep!.approver_role as any)
        .eq("tenant_id", companyId);
      if (!data || data.length === 0) return [];
      const userIds = data.map((r: any) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      return profs || [];
    },
    enabled: !!currentStep?.approver_role && isPending,
  });

  const getActorName = (userId: string) => {
    const p = profiles.find((pr: any) => pr.user_id === userId);
    return p?.full_name || "مستخدم";
  };

  const ACTION_LABELS: Record<string, string> = {
    submit: "إرسال للموافقة",
    approve: "اعتماد",
    reject: "رفض",
    return: "إرجاع للتعديل",
    escalate: "تصعيد",
    lock: "قفل",
  };

  // Pipeline stages
  const stages = [
    { key: "draft", label: "مسودة" },
    { key: "processing", label: "بانتظار الموافقة" },
    { key: "approved", label: "معتمد" },
    { key: "paid", label: "مدفوع" },
  ];

  const currentIdx = stages.findIndex((s) => s.key === currentStatus);
  const isTerminal = ["rejected", "returned"].includes(currentStatus);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          مسار اعتماد الرواتب
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Pipeline */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, idx) => {
            const isActive = stage.key === currentStatus;
            const isPast = idx < currentIdx && !isTerminal;
            const isFuture = idx > currentIdx || isTerminal;

            return (
              <div key={stage.key} className="flex items-center gap-1">
                {idx > 0 && (
                  <ArrowLeft className={cn(
                    "h-3 w-3 shrink-0 rotate-180",
                    isPast ? "text-primary" : "text-muted-foreground/30"
                  )} />
                )}
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading whitespace-nowrap transition-all",
                  isActive && (PAYROLL_STATUS_MAP[stage.key]?.color || "bg-primary/15 text-primary"),
                  isPast && "bg-primary/10 text-primary",
                  isFuture && "bg-muted text-muted-foreground/50",
                )}>
                  {isPast && <CheckCircle className="h-3 w-3" />}
                  {isActive && <StatusIcon className="h-3 w-3" />}
                  {stage.label}
                </div>
              </div>
            );
          })}
          {isTerminal && (
            <>
              <ArrowLeft className="h-3 w-3 shrink-0 rotate-180 text-destructive/50" />
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading whitespace-nowrap", statusMeta.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusMeta.labelAr}
              </div>
            </>
          )}
        </div>

        {/* Approval Chain — who approves at each step */}
        {workflowSteps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-heading font-medium text-muted-foreground">مراحل الاعتماد</p>
            <div className="flex flex-wrap gap-2">
              {workflowSteps.map((step: any) => {
                const stepCompleted = approvalActions.some(
                  (a: any) => a.step_order === step.step_order && a.action === "approve"
                );
                const isCurrent = isPending && step.step_order === (workflowInstance?.current_step_order || 1);
                return (
                  <div key={step.id} className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all",
                    stepCompleted && "bg-primary/10 text-primary border-primary/20",
                    isCurrent && "bg-accent/10 text-accent-foreground border-accent/30 ring-2 ring-accent/20",
                    !stepCompleted && !isCurrent && "bg-muted/50 text-muted-foreground border-border",
                  )}>
                    {stepCompleted ? <CheckCircle className="h-3 w-3 text-primary" /> : 
                     isCurrent ? <Clock className="h-3 w-3 animate-pulse" /> : 
                     <ShieldCheck className="h-3 w-3 opacity-40" />}
                    <span className="font-heading">مرحلة {step.step_order}:</span>
                    <span>{ROLE_LABELS[step.approver_role] || step.approver_role}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Approver Card */}
        {isPending && currentStep && (
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-xs font-heading font-semibold text-accent-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              بانتظار الموافقة من: {ROLE_LABELS[currentStep.approver_role] || currentStep.approver_role}
              <Badge variant="outline" className="text-[10px] h-4 px-1">مرحلة {currentStep.step_order}</Badge>
            </p>
            {currentApprovers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentApprovers.map((approver: any) => (
                  <div key={approver.user_id} className="flex items-center gap-1.5 text-xs bg-background px-2 py-1 rounded-md border">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{approver.full_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current State Card (non-pending) */}
        {!isPending && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-1">
              <Badge variant="outline" className={cn(statusMeta.color, "text-xs")}>{statusMeta.labelAr}</Badge>
              {statusMeta.nextAction && (
                <p className="text-xs text-muted-foreground">
                  الإجراء التالي: <span className="font-medium text-foreground">{statusMeta.nextActionLabelAr}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Approval History */}
        {approvalActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-heading font-medium text-muted-foreground">سجل الإجراءات</p>
            <div className="space-y-2">
              {approvalActions.map((action: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 p-1 rounded-full bg-muted">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getActorName(action.actor_user_id)}</span>
                      <Badge variant="outline" className="text-[9px] px-1">
                        {ACTION_LABELS[action.action] || action.action}
                      </Badge>
                    </div>
                    {action.comments && (
                      <p className="text-muted-foreground mt-0.5">{action.comments}</p>
                    )}
                    <p className="text-muted-foreground/60 mt-0.5">
                      {new Date(action.created_at).toLocaleString("ar-IQ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {approvalActions.length === 0 && currentStatus !== "draft" && (
          <p className="text-xs text-muted-foreground text-center py-2">لا يوجد إجراءات موافقة مسجلة بعد</p>
        )}
      </CardContent>
    </Card>
  );
}
