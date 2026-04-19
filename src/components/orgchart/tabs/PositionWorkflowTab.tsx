import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Workflow, FileText, DollarSign, Users, Clock, ShieldCheck,
  Award, GraduationCap, Briefcase, CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { WorkflowOwnershipPanel } from "@/components/approvals/WorkflowOwnershipPanel";

interface Props {
  positionId: string;
  companyId: string;
  workflowResponsibilities: Record<string, boolean> | null;
}

interface WorkflowAuth {
  key: string;
  nameAr: string;
  descriptionAr: string;
  icon: typeof Workflow;
  category: "hr" | "finance" | "operations";
}

const WORKFLOW_AUTHORITIES: WorkflowAuth[] = [
  { key: "approves_leave", nameAr: "الموافقة على الإجازات", descriptionAr: "للمرؤوسين المباشرين", icon: Clock, category: "hr" },
  { key: "approves_attendance_correction", nameAr: "تصحيح الحضور", descriptionAr: "الموافقة على تعديلات الحضور", icon: Users, category: "hr" },
  { key: "approves_documents", nameAr: "الموافقة على المستندات", descriptionAr: "اعتماد المستندات الرسمية", icon: FileText, category: "hr" },
  { key: "approves_onboarding", nameAr: "الموافقة على التهيئة", descriptionAr: "اعتماد خطط تهيئة الموظفين الجدد", icon: Users, category: "hr" },
  { key: "approves_exit", nameAr: "الموافقة على إنهاء الخدمة", descriptionAr: "اعتماد طلبات إنهاء الخدمة", icon: AlertCircle, category: "hr" },
  { key: "approves_payroll", nameAr: "الموافقة على الرواتب", descriptionAr: "اعتماد كشف الرواتب الشهري", icon: DollarSign, category: "finance" },
  { key: "approves_salary_adjustment", nameAr: "تعديل الرواتب", descriptionAr: "الموافقة على تعديلات الرواتب", icon: DollarSign, category: "finance" },
  { key: "approves_loans", nameAr: "الموافقة على السلف", descriptionAr: "اعتماد طلبات السلف المالية", icon: Briefcase, category: "finance" },
  { key: "approves_recruitment", nameAr: "الموافقة على التوظيف", descriptionAr: "اعتماد طلبات التوظيف والعروض", icon: Users, category: "operations" },
  { key: "approves_training", nameAr: "الموافقة على التدريب", descriptionAr: "اعتماد طلبات التدريب", icon: GraduationCap, category: "operations" },
  { key: "approves_performance", nameAr: "الموافقة على التقييمات", descriptionAr: "اعتماد تقييمات الأداء", icon: Award, category: "operations" },
];

const CATEGORY_LABELS: Record<string, { nameAr: string; icon: typeof Users }> = {
  hr: { nameAr: "الموارد البشرية", icon: Users },
  finance: { nameAr: "المالية", icon: DollarSign },
  operations: { nameAr: "العمليات", icon: Briefcase },
};

export default function PositionWorkflowTab({ positionId, companyId, workflowResponsibilities }: Props) {
  const queryClient = useQueryClient();
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>(workflowResponsibilities || {});

  const saveMutation = useMutation({
    mutationFn: async (perms: Record<string, boolean>) => {
      const { error } = await supabase
        .from("positions")
        .update({ workflow_responsibilities: perms } as any)
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-ownership", positionId] });
      toast({ title: "تم حفظ صلاحيات الموافقة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في الحفظ", variant: "destructive" }),
  });

  const handleToggle = useCallback((key: string, value: boolean) => {
    const updated = { ...localPerms, [key]: value };
    setLocalPerms(updated);
    saveMutation.mutate(updated);
  }, [localPerms, saveMutation]);

  const enabledCount = Object.values(localPerms).filter(Boolean).length;
  const categories = ["hr", "finance", "operations"] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          حدد الطلبات التي يحق لهذا المنصب الموافقة عليها. يتم ربطها تلقائياً بمحرك سير العمل.
        </p>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {enabledCount}/{WORKFLOW_AUTHORITIES.length} صلاحية
        </Badge>
      </div>

      {/* Workflow Authority Toggles */}
      {categories.map((cat, ci) => {
        const CatMeta = CATEGORY_LABELS[cat];
        const CatIcon = CatMeta.icon;
        const items = WORKFLOW_AUTHORITIES.filter(w => w.category === cat);

        return (
          <div key={cat}>
            {ci > 0 && <Separator className="my-2" />}
            <div className="flex items-center gap-1.5 mb-2">
              <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">{CatMeta.nameAr}</span>
            </div>
            <div className="space-y-1">
              {items.map((auth) => {
                const enabled = localPerms[auth.key] === true;
                const Icon = auth.icon;
                return (
                  <div
                    key={auth.key}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                      enabled ? "border-primary/20 bg-primary/5" : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Icon className={`h-4 w-4 shrink-0 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{auth.nameAr}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{auth.descriptionAr}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {enabled && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                      <Switch checked={enabled} onCheckedChange={(v) => handleToggle(auth.key, v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Separator />

      {/* Active Workflow Assignments from templates */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          الارتباطات الفعلية بالقوالب
        </h4>
        <WorkflowOwnershipPanel positionId={positionId} companyId={companyId} />
      </div>
    </div>
  );
}
