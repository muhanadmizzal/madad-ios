import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  GitBranch,
  HandHelping,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DeptDiag {
  department_id: string;
  name: string;
  employees: number;
  positions: number;
  filled: number;
  missing: number;
  has_manager: boolean;
  inconsistent: boolean;
}

interface UnresolvedRecord {
  type: string;
  id: string | null;
  name: string;
  message: string;
  severity: "critical" | "warning" | "info";
  action_path?: string;
}

interface SyncAudit {
  employees: {
    total_active_employees: number;
    employees_missing_position_before: number;
    employees_repaired: number;
    employees_unresolved: number;
  };
  positions: {
    total_positions_before: number;
    positions_created: number;
    positions_repaired: number;
    vacant_positions: number;
    duplicate_or_invalid_positions: number;
  };
  departments: {
    departments_with_employees_no_positions_before: number;
    departments_fixed: number;
    departments_still_inconsistent: number;
  };
  managers: {
    missing_manager_positions_detected: number;
    manager_positions_created: number;
    unresolved_manager_mappings: number;
  };
  roles_permissions: {
    mismatched_permissions_repaired: number;
    unresolved_permission_mismatches: number;
  };
  workflows: {
    workflows_missing_approvers: number;
    workflows_repaired_via_hierarchy_fallback: number;
    unresolved_workflow_chains: number;
  };
}

interface SyncResult {
  created_positions: { id: string; title: string; reason: string; severity?: string }[];
  linked_employees: { employee_id: string; name: string; position_id: string }[];
  fixed_managers: { entity: string; entity_id: string; entity_name?: string; position_id: string }[];
  repaired_relations: { position_id: string; title?: string; fix: string }[];
  conflicts: { type: string; message: string; entity_id?: string; severity?: "critical" | "warning" | "info" }[];
  warnings: string[];
  errors: string[];
  summary: Record<string, number>;
  before: Record<string, number>;
  after: Record<string, number>;
  consistency_score: number;
  company_consistency_score: number;
  repaired_count: number;
  unresolved_count: number;
  blocking_errors_count: number;
  final_status: "success" | "partial" | "failed";
  department_diagnostics?: DeptDiag[];
  unresolved_records?: UnresolvedRecord[];
  audit: SyncAudit;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const conflictTypeLabels: Record<string, string> = {
  employee_no_position: "موظف بدون منصب",
  broken_parent: "رابط أب مكسور",
  circular_hierarchy: "مرجع دائري",
  manager_not_found: "مدير غير موجود",
  duplicate_position: "منصب مكرر",
  broken_position_ref: "رابط منصب مكسور",
  multi_employee_position: "منصب مشترك",
  dept_no_positions: "تشكيل بدون مناصب",
  employee_without_position: "موظف غير مربوط",
  missing_manager_position: "منصب مدير مفقود",
  workflow_missing_approver: "سلسلة اعتماد ناقصة",
};

const summaryLabelMap: Record<string, string> = {
  total_active_employees: "الموظفون النشطون",
  total_active_positions: "المناصب النشطة",
  employees_missing_position: "موظفون بدون منصب",
  departments_with_employees_no_positions: "تشكيلات غير متسقة",
  missing_manager_positions: "مناصب مدراء مفقودة",
  orphan_positions: "مناصب يتيمة",
};

function getManualFixGuide(type: string): string | null {
  const guides: Record<string, string> = {
    employee_no_position: "افتح صفحة الموظف → اختر منصب من الهيكل التنظيمي وعيّنه عليه",
    employee_without_position: "افتح صفحة الموظف → اختر منصب من الهيكل التنظيمي وعيّنه عليه",
    missing_manager_position: "افتح صفحة القسم → عيّن منصب مدير من المناصب الموجودة أو أنشئ منصب جديد",
    manager_not_found: "افتح صفحة القسم → تأكد أن المنصب الإداري المعيّن موجود ومشغول بموظف",
    broken_parent: "افتح المنصب في الهيكل → أعد ربطه بالمنصب الأعلى الصحيح (سحب وإفلات أو تعديل)",
    circular_hierarchy: "افتح المناصب المتورطة → غيّر أحد روابط parent_position_id لكسر الحلقة الدائرية",
    duplicate_position: "افتح المنصب المكرر → انقل الموظفين لمنصب واحد ثم أرشف المكرر",
    multi_employee_position: "افتح المنصب → انقل الموظفين الزائدين إلى مناصب أخرى (منصب واحد = موظف واحد)",
    dept_no_positions: "افتح القسم → أنشئ مناصب جديدة داخله أو انقل مناصب موجودة إليه",
    broken_position_ref: "افتح المنصب → أعد ربطه بقسم أو منصب أعلى صالح",
    workflow_missing_approver: "افتح إعدادات سير العمل → تأكد أن كل خطوة لها معتمد محدد ومنصبه مشغول",
  };
  return guides[type] || null;
}

export default function OrgSyncDialog({ open, onOpenChange }: Props) {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [options, setOptions] = useState({
    sync_branches: true,
    sync_departments: true,
    sync_positions: true,
    sync_employees: true,
    fix_managers: true,
    repair_hierarchy: true,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [isPreview, setIsPreview] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["status", "before_after", "audit"]));
  const [progressStep, setProgressStep] = useState<string>("");
  const [progressSteps, setProgressSteps] = useState<{ label: string; done: boolean }[]>([]);

  const toggleOpt = (key: keyof typeof options) => setOptions((s) => ({ ...s, [key]: !s[key] }));
  const toggleSection = (k: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const criticalCount = useMemo(
    () => result?.conflicts.filter((c) => c.severity === "critical").length || 0,
    [result]
  );

  const hasWork = !!result && (
    result.repaired_count > 0 ||
    result.unresolved_count > 0 ||
    result.created_positions.length > 0 ||
    result.linked_employees.length > 0 ||
    result.fixed_managers.length > 0 ||
    result.repaired_relations.length > 0
  );

  const statusStyles = useMemo(() => {
    if (!result) return "border-border bg-muted/20 text-foreground";
    if (result.final_status === "success") return "border-success/30 bg-success/10 text-success";
    if (result.final_status === "partial") return "border-warning/30 bg-warning/10 text-warning";
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }, [result]);

  const runSync = async (preview: boolean) => {
    if (!companyId) return;

    setLoading(true);
    setIsPreview(preview);
    setResult(null);

    // Step-by-step progress simulation
    const steps = [
      { label: "فحص الفروع والتشكيلات", done: false },
      { label: "فحص المناصب والمدراء", done: false },
      { label: "ربط الموظفين بالمناصب", done: false },
      { label: "إصلاح الهرمية والعلاقات", done: false },
      { label: "فحص سلاسل الاعتماد", done: false },
      { label: "إعداد التقرير", done: false },
    ];
    setProgressSteps(steps.map(s => ({ ...s })));

    // Animate steps
    for (let i = 0; i < steps.length; i++) {
      setProgressStep(steps[i].label);
      await new Promise(r => setTimeout(r, 400));
      setProgressSteps(prev => prev.map((s, idx) => idx <= i ? { ...s, done: true } : s));
    }

    try {
      const { data, error } = await supabase.functions.invoke("sync-org-structure", {
        body: { company_id: companyId, preview, ...options },
      });

      if (error) throw error;
      const nextResult = data?.result as SyncResult;
      setResult(nextResult);
      setProgressStep("");

      if (!preview) {
        queryClient.invalidateQueries({ queryKey: ["org-positions", companyId] });
        queryClient.invalidateQueries({ queryKey: ["org-employees", companyId] });
        queryClient.invalidateQueries({ queryKey: ["org-departments", companyId] });
        queryClient.invalidateQueries({ queryKey: ["positions", companyId] });
        queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
        queryClient.invalidateQueries({ queryKey: ["departments", companyId] });
        queryClient.invalidateQueries({ queryKey: ["branches", companyId] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["direct-manager"] });
        queryClient.invalidateQueries({ queryKey: ["manager-chain"] });

        if (nextResult.final_status === "success") {
          toast({ title: "اكتملت المزامنة بنجاح" });
        } else if (nextResult.final_status === "partial") {
          toast({ title: "تم إصلاح جزء من المشاكل", description: "توجد عناصر غير محلولة", variant: "destructive" });
        } else {
          toast({ title: "فشل الإصلاح", description: "تعذر إكمال المزامنة", variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "خطأ في المزامنة", description: err.message, variant: "destructive" });
      setProgressStep("");
    } finally {
      setLoading(false);
    }
  };

  const openPath = (path?: string) => {
    if (!path) return;
    window.location.assign(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            فحص وإصلاح الهيكل التنظيمي
          </DialogTitle>
        </DialogHeader>

        {!result && !loading && (
          <div className="space-y-4 overflow-auto flex-1 min-h-0">
            <p className="text-sm text-muted-foreground">
              محرك إصلاح صارم: لا يعتبر الهيكل متزامناً إلا بعد إصلاح المشاكل فعلياً.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "sync_branches" as const, label: "مزامنة الفروع" },
                { key: "sync_departments" as const, label: "مزامنة التشكيلات" },
                { key: "sync_positions" as const, label: "إنشاء/إصلاح المناصب" },
                { key: "sync_employees" as const, label: "ربط الموظفين بالمناصب" },
                { key: "fix_managers" as const, label: "إصلاح مناصب المدراء" },
                { key: "repair_hierarchy" as const, label: "إصلاح الهرمية" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={options[key]} onCheckedChange={() => toggleOpt(key)} />
                </div>
              ))}
            </div>

            <Button onClick={() => runSync(true)} disabled={loading} className="w-full gap-2 font-heading">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              معاينة الإصلاح
            </Button>
          </div>
        )}

        {/* Step-by-step progress */}
        {loading && !result && (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col items-center justify-center py-8">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="font-heading font-semibold text-foreground">{progressStep || "جاري الفحص..."}</p>
            <div className="w-full max-w-sm space-y-2">
              {progressSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {step.done ? (
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className={cn("text-xs", step.done ? "text-foreground" : "text-muted-foreground")}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <ScrollArea className="flex-1 -mx-4 px-4 sm:-mx-6 sm:px-6 min-h-0 overflow-y-auto" style={{ maxHeight: "calc(90dvh - 140px)" }}>
            <div className="space-y-3 pb-4">
              <Card className={cn("border", statusStyles)}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {result.final_status === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertOctagon className="h-4 w-4" />
                    )}
                    <span className="font-heading text-sm">
                      {isPreview ? "معاينة" : "تطبيق"} — الحالة النهائية: {result.final_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">Fixed {result.repaired_count}</Badge>
                    <Badge variant="outline">Unresolved {result.unresolved_count}</Badge>
                    <Badge variant="outline">Blocking {result.blocking_errors_count}</Badge>
                    <Badge variant="outline">Score {result.company_consistency_score}%</Badge>
                  </div>
                </CardContent>
              </Card>

              {!hasWork && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-10 w-10 text-success mx-auto mb-2" />
                    <p className="font-heading font-semibold">لا توجد مشاكل تحتاج إصلاح</p>
                  </CardContent>
                </Card>
              )}

              {[
                { key: "before_after", label: "قبل / بعد", icon: ArrowRight },
                { key: "audit", label: "تقرير الإصلاح", icon: Shield },
                { key: "actions", label: "التغييرات المنفذة", icon: GitBranch },
                { key: "diagnostics", label: "تشخيص التشكيلات", icon: Building2 },
                { key: "unresolved", label: "العناصر غير المحلولة", icon: AlertTriangle },
              ].map((section) => {
                const isOpen = expanded.has(section.key);
                return (
                  <Card key={section.key} className="overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <section.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-heading font-semibold">{section.label}</span>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <CardContent className="px-4 pb-3 pt-0">
                        <Separator className="mb-3" />

                        {section.key === "before_after" && (
                          <div className="space-y-1">
                            <div className="grid grid-cols-3 gap-2 px-2 text-[10px] font-heading text-muted-foreground">
                              <span>البند</span><span className="text-center">قبل</span><span className="text-center">بعد</span>
                            </div>
                            {Object.keys(result.before).map((k) => (
                              <div key={k} className="grid grid-cols-3 gap-2 px-2 py-1.5 rounded bg-muted/30 text-xs">
                                <span className="truncate">{summaryLabelMap[k] || k}</span>
                                <span className="text-center font-semibold">{result.before[k] || 0}</span>
                                <span className="text-center font-semibold">{result.after[k] || 0}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {section.key === "audit" && (
                          <div className="space-y-1.5 text-xs">
                            <div className="rounded bg-muted/30 p-2">الموظفون: Missing قبل {result.audit.employees.employees_missing_position_before} • Fixed {result.audit.employees.employees_repaired} • Unresolved {result.audit.employees.employees_unresolved}</div>
                            <div className="rounded bg-muted/30 p-2">المناصب: Created {result.audit.positions.positions_created} • Repaired {result.audit.positions.positions_repaired} • Vacant {result.audit.positions.vacant_positions} • Invalid {result.audit.positions.duplicate_or_invalid_positions}</div>
                            <div className="rounded bg-muted/30 p-2">التشكيلات: قبل {result.audit.departments.departments_with_employees_no_positions_before} • Fixed {result.audit.departments.departments_fixed} • Unresolved {result.audit.departments.departments_still_inconsistent}</div>
                            <div className="rounded bg-muted/30 p-2">المدراء: Detected {result.audit.managers.missing_manager_positions_detected} • Created {result.audit.managers.manager_positions_created} • Unresolved {result.audit.managers.unresolved_manager_mappings}</div>
                            <div className="rounded bg-muted/30 p-2">الأدوار/الصلاحيات: Repaired {result.audit.roles_permissions.mismatched_permissions_repaired} • Unresolved {result.audit.roles_permissions.unresolved_permission_mismatches}</div>
                            <div className="rounded bg-muted/30 p-2">الاعتمادات: Missing {result.audit.workflows.workflows_missing_approvers} • Fallback fixed {result.audit.workflows.workflows_repaired_via_hierarchy_fallback} • Unresolved {result.audit.workflows.unresolved_workflow_chains}</div>
                          </div>
                        )}

                        {section.key === "actions" && (
                          <div className="space-y-1.5 text-xs">
                            {result.created_positions.map((p, i) => (
                              <div key={`cp-${i}`} className="rounded bg-muted/30 px-2 py-1.5">+ {p.title} — {p.reason}</div>
                            ))}
                            {result.linked_employees.map((e, i) => (
                              <div key={`le-${i}`} className="rounded bg-muted/30 px-2 py-1.5">ربط الموظف {e.name}</div>
                            ))}
                            {result.fixed_managers.map((m, i) => (
                              <div key={`fm-${i}`} className="rounded bg-muted/30 px-2 py-1.5">إصلاح مدير {m.entity_name || m.entity_id}</div>
                            ))}
                            {result.repaired_relations.map((r, i) => (
                              <div key={`rr-${i}`} className="rounded bg-muted/30 px-2 py-1.5">{r.title || r.position_id}: {r.fix}</div>
                            ))}
                            {result.created_positions.length === 0 && result.linked_employees.length === 0 && result.fixed_managers.length === 0 && result.repaired_relations.length === 0 && (
                              <div className="text-muted-foreground">لا توجد تغييرات.</div>
                            )}
                          </div>
                        )}

                        {section.key === "diagnostics" && (
                          <div className="space-y-1">
                            <div className="grid grid-cols-7 gap-1 text-[9px] text-muted-foreground font-heading px-1">
                              <span className="col-span-2">التشكيل</span><span className="text-center">موظف</span><span className="text-center">مناصب</span><span className="text-center">مشغول</span><span className="text-center">مدير</span><span className="text-center">إجراء</span>
                            </div>
                            {(result.department_diagnostics || []).map((d) => (
                              <div
                                key={d.department_id}
                                className={cn(
                                  "grid grid-cols-7 gap-1 text-xs px-1 py-1.5 rounded items-center",
                                  d.inconsistent ? "bg-destructive/10 border border-destructive/20" : "bg-muted/30"
                                )}
                              >
                                <span className="col-span-2 truncate">{d.name}</span>
                                <span className="text-center font-semibold">{d.employees}</span>
                                <span className="text-center font-semibold">{d.positions}</span>
                                <span className="text-center">{d.filled}</span>
                                <span className="text-center">{d.has_manager ? "✓" : "—"}</span>
                                <div className="text-center">
                                  {d.inconsistent ? (
                                    isPreview ? (
                                      <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => runSync(false)} disabled={loading}>إصلاح الآن</Button>
                                    ) : (
                                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => openPath("/departments")}>فتح</Button>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {section.key === "unresolved" && (
                          <div className="space-y-3">
                            {/* Manual action required notice */}
                            {(result.unresolved_records || []).length > 0 && (
                              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
                                <HandHelping className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs font-heading font-bold text-amber-800 dark:text-amber-300">هذه المشاكل تتطلب تدخل يدوي</p>
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">لا يمكن إصلاحها تلقائياً لأنها تحتاج قرار بشري (مثل تعيين مدير، اختيار قسم، إلخ)</p>
                                </div>
                              </div>
                            )}

                            {(result.unresolved_records || []).map((r, i) => {
                              const manualGuide = getManualFixGuide(r.type);
                              return (
                                <div key={`${r.type}-${r.id || i}`} className="rounded-lg border border-border overflow-hidden">
                                  <div className="px-3 py-2.5 bg-muted/30 flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <XCircle className={cn("h-3.5 w-3.5 shrink-0", r.severity === "critical" ? "text-destructive" : "text-amber-500")} />
                                        <p className="text-xs font-heading font-semibold truncate">
                                          {conflictTypeLabels[r.type] || r.type}
                                        </p>
                                        <Badge variant={r.severity === "critical" ? "destructive" : r.severity === "warning" ? "secondary" : "outline"} className="text-[9px] h-4">
                                          {r.severity === "critical" ? "حرج" : r.severity === "warning" ? "تحذير" : "ملاحظة"}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-foreground mt-0.5 font-medium">{r.name}</p>
                                      <p className="text-[11px] text-muted-foreground">{r.message}</p>
                                    </div>
                                    {r.action_path && (
                                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 shrink-0" onClick={() => openPath(r.action_path)}>
                                        <ExternalLink className="h-3 w-3" />
                                        فتح
                                      </Button>
                                    )}
                                  </div>
                                  {manualGuide && (
                                    <div className="px-3 py-2 border-t border-border bg-blue-50/50 dark:bg-blue-950/20">
                                      <p className="text-[10px] text-blue-700 dark:text-blue-400 font-heading font-semibold mb-0.5">💡 كيفية الإصلاح يدوياً:</p>
                                      <p className="text-[10px] text-blue-600 dark:text-blue-300">{manualGuide}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {(result.unresolved_records || []).length === 0 && (
                              <div className="text-center py-4">
                                <CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" />
                                <div className="text-xs text-muted-foreground">لا توجد عناصر غير محلولة — جميع المشاكل تم إصلاحها ✓</div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {criticalCount > 0 && (
                <Card className="border-destructive/20 bg-destructive/5">
                  <CardContent className="p-3 text-xs text-destructive font-heading">
                    يوجد {criticalCount} مشاكل حرجة؛ لن يتم اعتبار الحالة Success حتى تُحل بالكامل.
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}

        {result && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setResult(null)} className="font-heading">رجوع</Button>
            {isPreview && (
              <Button onClick={() => runSync(false)} disabled={loading} className="flex-1 gap-2 font-heading">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                تطبيق الإصلاح
              </Button>
            )}
            {!isPreview && (
              <Button onClick={() => onOpenChange(false)} className="flex-1 font-heading">إغلاق</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
