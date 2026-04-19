import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CalendarDays, ShieldCheck, Save, AlertCircle, FileText, UserCog, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";

interface Props {
  positionId: string;
  companyId: string;
}

const SHIFT_OPTIONS = [
  { value: "morning", label: "صباحي (8:00 - 16:00)" },
  { value: "evening", label: "مسائي (16:00 - 00:00)" },
  { value: "night", label: "ليلي (00:00 - 8:00)" },
  { value: "flexible", label: "مرن" },
  { value: "split", label: "مقسم" },
];

interface OperationsConfig {
  work_shift?: string;
  attendance_rules?: {
    grace_minutes?: number;
    overtime_enabled?: boolean;
  };
}

export default function DrawerOperationsTab({ positionId, companyId }: Props) {
  const queryClient = useQueryClient();
  const { hasRole } = useRole();
  const canEdit = hasRole("hr_manager") || hasRole("admin") || hasRole("tenant_admin");

  // Fetch position data
  const { data: posData } = useQuery({
    queryKey: ["position-operations", positionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("service_permissions")
        .eq("id", positionId)
        .single();
      const sp = (data?.service_permissions as any) || {};
      return (sp.__operations as OperationsConfig) || {};
    },
    enabled: !!positionId,
  });

  // Fetch all work policies from Settings
  const { data: policies = [] } = useQuery({
    queryKey: ["work-policies", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_policies")
        .select("id, name, is_default, salary_basis, standard_hours_per_day, late_grace_minutes, overtime_enabled, description")
        .eq("company_id", companyId)
        .order("is_default", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch policy assignment for this position
  const { data: positionAssignment } = useQuery({
    queryKey: ["position-policy-assignment", positionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("policy_assignments")
        .select("id, policy_id, payroll_policies(name)")
        .eq("company_id", companyId)
        .eq("assignment_type", "position")
        .eq("assignment_target_id", positionId)
        .maybeSingle();
      return data;
    },
    enabled: !!positionId && !!companyId,
  });

  // Fetch employees on this position with their individual policy overrides
  const { data: positionEmployees = [] } = useQuery({
    queryKey: ["position-employees-policies", positionId, companyId],
    queryFn: async () => {
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name_ar, employee_code")
        .eq("company_id", companyId)
        .eq("position_id", positionId)
        .eq("status", "active");
      if (!emps || emps.length === 0) return [];

      // Fetch individual policy assignments for these employees
      const empIds = emps.map(e => e.id);
      const { data: empAssigns } = await supabase
        .from("policy_assignments")
        .select("id, policy_id, assignment_target_id, payroll_policies(name)")
        .eq("company_id", companyId)
        .eq("assignment_type", "employee")
        .in("assignment_target_id", empIds);

      return emps.map(emp => ({
        ...emp,
        policyAssignment: (empAssigns || []).find((a: any) => a.assignment_target_id === emp.id) || null,
      }));
    },
    enabled: !!positionId && !!companyId,
  });

  const [config, setConfig] = useState<OperationsConfig>({});
  const ops: OperationsConfig = { ...posData, ...config };

  const defaultPolicy = policies.find((p: any) => p.is_default);
  const assignedPolicyId = positionAssignment?.policy_id || defaultPolicy?.id || null;
  const assignedPolicy = policies.find((p: any) => p.id === assignedPolicyId);

  // Save operations config (shift, attendance rules)
  const saveMutation = useMutation({
    mutationFn: async (newConfig: OperationsConfig) => {
      const { data: current } = await supabase
        .from("positions")
        .select("service_permissions")
        .eq("id", positionId)
        .single();
      const sp = (current?.service_permissions as any) || {};
      sp.__operations = newConfig;
      const { error } = await supabase
        .from("positions")
        .update({ service_permissions: sp } as any)
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-operations", positionId] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم حفظ إعدادات العمليات" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في الحفظ", variant: "destructive" }),
  });

  // Assign/update policy for position
  const assignPolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      if (policyId === "__default") {
        // Remove position-specific assignment (fall back to default)
        if (positionAssignment?.id) {
          const { error } = await supabase
            .from("policy_assignments")
            .delete()
            .eq("id", positionAssignment.id);
          if (error) throw error;
        }
      } else if (positionAssignment?.id) {
        const { error } = await supabase
          .from("policy_assignments")
          .update({ policy_id: policyId })
          .eq("id", positionAssignment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("policy_assignments").insert({
          company_id: companyId,
          policy_id: policyId,
          assignment_type: "position",
          assignment_target_id: positionId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-policy-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["policy-assignments"] });
      toast({ title: "تم تحديث سياسة المنصب" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Per-employee policy override
  const assignEmployeePolicyMutation = useMutation({
    mutationFn: async ({ employeeId, policyId }: { employeeId: string; policyId: string }) => {
      const existing = positionEmployees.find(e => e.id === employeeId)?.policyAssignment;
      if (policyId === "__inherit") {
        // Remove employee override — inherit from position
        if (existing?.id) {
          const { error } = await supabase.from("policy_assignments").delete().eq("id", existing.id);
          if (error) throw error;
        }
      } else if (existing?.id) {
        const { error } = await supabase.from("policy_assignments").update({ policy_id: policyId }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("policy_assignments").insert({
          company_id: companyId,
          policy_id: policyId,
          assignment_type: "employee",
          assignment_target_id: employeeId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position-employees-policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-assignments"] });
      toast({ title: "تم تحديث سياسة الموظف" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate(ops);
  }, [ops, saveMutation]);

  const updateConfig = useCallback((partial: Partial<OperationsConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  if (!canEdit) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">ليس لديك صلاحية تعديل إعدادات العمليات</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        حدد نوبة العمل وسياسة الإجازات والرواتب المرتبطة بهذا المنصب. السياسات تُدار من الإعدادات ويتم ربطها هنا.
      </p>

      {/* Work Shift */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-semibold">نوبة العمل</Label>
        </div>
        <Select
          value={ops.work_shift || ""}
          onValueChange={(v) => updateConfig({ work_shift: v })}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="اختر نوبة العمل" />
          </SelectTrigger>
          <SelectContent>
            {SHIFT_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Leave & Work Policy (from Settings) */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">سياسة الإجازات والعمل</span>
        </div>

        {policies.length === 0 ? (
          <div className="text-center py-4 border border-dashed rounded-lg text-muted-foreground">
            <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs">لم يتم إنشاء سياسات بعد. أنشئ سياسة من الإعدادات أولاً.</p>
          </div>
        ) : (
          <>
            <Select
              value={positionAssignment ? assignedPolicyId || "" : "__default"}
              onValueChange={(v) => assignPolicyMutation.mutate(v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="اختر السياسة..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default">
                  <span className="flex items-center gap-1">
                    السياسة الافتراضية
                    {defaultPolicy && <span className="text-muted-foreground">({defaultPolicy.name})</span>}
                  </span>
                </SelectItem>
                {policies.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-1">
                      {p.name}
                      {p.is_default && <Badge variant="secondary" className="text-[9px] px-1">افتراضية</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Policy summary */}
            {assignedPolicy && (
              <Card className="border-primary/20">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">{assignedPolicy.name}</span>
                    {positionAssignment && (
                      <Badge variant="outline" className="text-[9px]">مخصصة للمنصب</Badge>
                    )}
                  </div>
                  {(assignedPolicy as any).description && (
                    <p className="text-[10px] text-muted-foreground">{(assignedPolicy as any).description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span>ساعات العمل: {(assignedPolicy as any).standard_hours_per_day || 8}h</span>
                    <span>•</span>
                    <span>سماح التأخير: {(assignedPolicy as any).late_grace_minutes || 10} دقيقة</span>
                    <span>•</span>
                    <span>العمل الإضافي: {(assignedPolicy as any).overtime_enabled ? "مفعّل" : "معطّل"}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Per-Employee Policy Overrides */}
      {positionEmployees.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">تخصيص السياسة لكل موظف</span>
            <Badge variant="outline" className="text-[9px] mr-auto">
              {positionEmployees.filter(e => e.policyAssignment).length} مخصص
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            يمكن تعيين سياسة مختلفة لموظف محدد. بدون تخصيص يرث الموظف سياسة المنصب.
          </p>
          <div className="space-y-1.5">
            {positionEmployees.map(emp => {
              const currentPolicyId = emp.policyAssignment?.policy_id || null;
              const currentPolicyName = emp.policyAssignment
                ? (emp.policyAssignment as any).payroll_policies?.name
                : null;

              return (
                <div
                  key={emp.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                    emp.policyAssignment ? "border-accent/30 bg-accent/5" : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{emp.name_ar}</p>
                    {emp.employee_code && (
                      <p className="text-[10px] text-muted-foreground">{emp.employee_code}</p>
                    )}
                  </div>
                  <Select
                    value={currentPolicyId || "__inherit"}
                    onValueChange={(v) => assignEmployeePolicyMutation.mutate({ employeeId: emp.id, policyId: v })}
                  >
                    <SelectTrigger className="h-7 w-[150px] text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__inherit">
                        <span className="text-muted-foreground">وراثة المنصب</span>
                      </SelectItem>
                      {policies.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {positionEmployees.length > 0 && <Separator />}

      {/* Attendance Rules */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">قواعد الحضور</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card">
          <span className="text-xs font-medium">السماح بالعمل الإضافي</span>
          <Switch
            checked={ops.attendance_rules?.overtime_enabled || false}
            onCheckedChange={(v) =>
              updateConfig({ attendance_rules: { ...ops.attendance_rules, overtime_enabled: v } })
            }
          />
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </div>
  );
}
