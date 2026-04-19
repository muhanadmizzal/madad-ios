import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Wrench, CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Users, Building2, Briefcase, GitBranch, FileText, Shield,
  Loader2, ChevronDown, ChevronUp,
} from "lucide-react";

interface HealthIssue {
  id: string;
  category: "employees" | "positions" | "departments" | "workflows" | "documents" | "permissions";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  fixable: boolean;
  fixFn?: () => Promise<number>;
}

export default function SystemHealthCheck() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, number>>({});

  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ["system-health", companyId],
    queryFn: async (): Promise<HealthIssue[]> => {
      if (!companyId) return [];
      const found: HealthIssue[] = [];

      // 1. Employees without position_id
      const { count: noPos } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active")
        .is("position_id", null);
      if ((noPos || 0) > 0) {
        found.push({
          id: "emp-no-position",
          category: "employees",
          severity: "critical",
          title: "موظفون بدون منصب",
          description: "موظفون نشطون غير مربوطين بأي منصب في الهيكل التنظيمي",
          count: noPos || 0,
          fixable: true,
          fixFn: async () => {
            // Auto-create positions for employees without one
            const { data: emps } = await supabase
              .from("employees")
              .select("id, position, department_id")
              .eq("company_id", companyId)
              .eq("status", "active")
              .is("position_id", null);
            let fixed = 0;
            for (const emp of emps || []) {
              const { data: newPos } = await supabase
                .from("positions")
                .insert({
                  company_id: companyId,
                  title_ar: emp.position || "موظف",
                  department_id: emp.department_id || null,
                  status: "filled",
                  created_from: "health_check",
                })
                .select("id")
                .single();
              if (newPos) {
                await supabase
                  .from("employees")
                  .update({ position_id: newPos.id })
                  .eq("id", emp.id);
                fixed++;
              }
            }
            return fixed;
          },
        });
      }

      // 2. Employees without department_id
      const { count: noDept } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active")
        .is("department_id", null);
      if ((noDept || 0) > 0) {
        found.push({
          id: "emp-no-dept",
          category: "employees",
          severity: "warning",
          title: "موظفون بدون قسم",
          description: "موظفون نشطون غير مربوطين بأي قسم",
          count: noDept || 0,
          fixable: true,
          fixFn: async () => {
            // Try to inherit department from their position
            const { data: emps } = await supabase
              .from("employees")
              .select("id, position_id")
              .eq("company_id", companyId)
              .eq("status", "active")
              .is("department_id", null)
              .not("position_id", "is", null);
            let fixed = 0;
            for (const emp of emps || []) {
              const { data: pos } = await supabase
                .from("positions")
                .select("department_id")
                .eq("id", emp.position_id!)
                .single();
              if (pos?.department_id) {
                await supabase
                  .from("employees")
                  .update({ department_id: pos.department_id })
                  .eq("id", emp.id);
                fixed++;
              }
            }
            return fixed;
          },
        });
      }

      // 3. Positions without parent_position_id (orphan - not root)
      const { data: orphanPositions } = await supabase
        .from("positions")
        .select("id, department_id")
        .eq("company_id", companyId)
        .is("parent_position_id", null)
        .not("department_id", "is", null);
      // Check which ones have a department with a manager_position_id they should link to
      let orphanCount = 0;
      const orphanFixTargets: { posId: string; mgrPosId: string }[] = [];
      for (const pos of orphanPositions || []) {
        const { data: dept } = await supabase
          .from("departments")
          .select("manager_position_id")
          .eq("id", pos.department_id!)
          .single();
        if (dept?.manager_position_id && dept.manager_position_id !== pos.id) {
          orphanCount++;
          orphanFixTargets.push({ posId: pos.id, mgrPosId: dept.manager_position_id });
        }
      }
      if (orphanCount > 0) {
        found.push({
          id: "pos-no-parent",
          category: "positions",
          severity: "warning",
          title: "مناصب بدون ربط هرمي",
          description: "مناصب لها قسم لكن ليس لها ربط بالمنصب الأعلى (parent_position_id)",
          count: orphanCount,
          fixable: true,
          fixFn: async () => {
            let fixed = 0;
            for (const target of orphanFixTargets) {
              const { error } = await supabase
                .from("positions")
                .update({ parent_position_id: target.mgrPosId })
                .eq("id", target.posId);
              if (!error) fixed++;
            }
            return fixed;
          },
        });
      }

      // 4. Departments without manager_position_id
      const { count: deptNoMgr } = await supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("manager_position_id", null);
      if ((deptNoMgr || 0) > 0) {
        found.push({
          id: "dept-no-manager",
          category: "departments",
          severity: "warning",
          title: "أقسام بدون مدير",
          description: "أقسام لم يتم تعيين منصب مدير لها",
          count: deptNoMgr || 0,
          fixable: false,
        });
      }

      // 5. Stuck workflow instances
      const { count: stuckWf } = await supabase
        .from("workflow_instances")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["submitted", "pending_approval"])
        .is("current_approver_id", null);
      if ((stuckWf || 0) > 0) {
        found.push({
          id: "wf-stuck",
          category: "workflows",
          severity: "critical",
          title: "طلبات معلقة بدون معتمد",
          description: "طلبات في انتظار الموافقة لكن لا يوجد معتمد محدد",
          count: stuckWf || 0,
          fixable: true,
          fixFn: async () => {
            const { data } = await supabase.rpc("repair_stuck_workflow_instances");
            return (data as any)?.repaired || 0;
          },
        });
      }

      // 6. Employees with position but no valid manager chain
      const { data: empsWithPos } = await supabase
        .from("employees")
        .select("id, position_id")
        .eq("company_id", companyId)
        .eq("status", "active")
        .not("position_id", "is", null);
      let noManagerCount = 0;
      for (const emp of (empsWithPos || []).slice(0, 50)) {
        const { data: pos } = await supabase
          .from("positions")
          .select("parent_position_id, department_id")
          .eq("id", emp.position_id!)
          .single();
        if (!pos) continue;
        if (!pos.parent_position_id) {
          // Check department manager fallback
          if (pos.department_id) {
            const { data: dept } = await supabase
              .from("departments")
              .select("manager_position_id")
              .eq("id", pos.department_id)
              .single();
            if (!dept?.manager_position_id || dept.manager_position_id === emp.position_id) {
              noManagerCount++;
            }
          } else {
            noManagerCount++;
          }
        }
      }
      if (noManagerCount > 0) {
        found.push({
          id: "emp-no-manager-chain",
          category: "positions",
          severity: "warning",
          title: "موظفون بدون سلسلة مدير",
          description: "موظفون لديهم منصب لكن منصبهم لا يرتبط بمنصب أعلى ولا بمدير قسم",
          count: noManagerCount,
          fixable: false,
        });
      }

      // 7. Employees without user_id
      const { count: noUserId } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active")
        .is("user_id", null);
      if ((noUserId || 0) > 0) {
        found.push({
          id: "emp-no-user",
          category: "permissions",
          severity: "info",
          title: "موظفون بدون حساب مستخدم",
          description: "موظفون نشطون ليس لديهم حساب دخول للنظام — لن يستطيعوا تسجيل الدخول أو استلام شهادات تلقائية",
          count: noUserId || 0,
          fixable: false,
        });
      }

      // 8. Positions with invalid parent (parent doesn't exist)
      const { data: allPositions } = await supabase
        .from("positions")
        .select("id, parent_position_id")
        .eq("company_id", companyId)
        .not("parent_position_id", "is", null);
      if (allPositions?.length) {
        const posIds = new Set(allPositions.map(p => p.id));
        // Also get all position IDs in the company
        const { data: allPosIds } = await supabase
          .from("positions")
          .select("id")
          .eq("company_id", companyId);
        const validIds = new Set((allPosIds || []).map((p: any) => p.id));
        const invalidParents = allPositions.filter(p => p.parent_position_id && !validIds.has(p.parent_position_id));
        if (invalidParents.length > 0) {
          found.push({
            id: "pos-invalid-parent",
            category: "positions",
            severity: "critical",
            title: "مناصب مرتبطة بمنصب أعلى غير موجود",
            description: "مناصب لديها parent_position_id يشير لمنصب محذوف أو غير موجود",
            count: invalidParents.length,
            fixable: true,
            fixFn: async () => {
              let fixed = 0;
              for (const p of invalidParents) {
                const { error } = await supabase
                  .from("positions")
                  .update({ parent_position_id: null })
                  .eq("id", p.id);
                if (!error) fixed++;
              }
              return fixed;
            },
          });
        }
      }

      return found;
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const handleFix = async (issue: HealthIssue) => {
    if (!issue.fixFn) return;
    setFixing(issue.id);
    try {
      const fixed = await issue.fixFn();
      setFixResults((prev) => ({ ...prev, [issue.id]: fixed }));
      toast({ title: `تم إصلاح ${fixed} عنصر` });
      queryClient.invalidateQueries({ queryKey: ["system-health"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      refetch();
    } catch (err: any) {
      toast({ title: "خطأ في الإصلاح", description: err.message, variant: "destructive" });
    } finally {
      setFixing(null);
    }
  };

  const handleFixAll = async () => {
    const fixable = issues.filter((i) => i.fixable && i.fixFn);
    for (const issue of fixable) {
      await handleFix(issue);
    }
  };

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;
  const totalIssues = issues.length;
  const fixableCount = issues.filter((i) => i.fixable).length;
  const healthScore = totalIssues === 0 ? 100 : Math.max(0, 100 - criticalCount * 25 - warningCount * 10 - infoCount * 2);

  const categoryIcons: Record<string, typeof Users> = {
    employees: Users,
    positions: Briefcase,
    departments: Building2,
    workflows: GitBranch,
    documents: FileText,
    permissions: Shield,
  };

  const severityConfig = {
    critical: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: XCircle, label: "حرج" },
    warning: { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", icon: AlertTriangle, label: "تحذير" },
    info: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", icon: AlertTriangle, label: "ملاحظة" },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          فحص وإصلاح النظام
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ml-1 ${isLoading ? "animate-spin" : ""}`} />
            فحص
          </Button>
          {fixableCount > 0 && (
            <Button size="sm" className="gap-1.5 font-heading" onClick={handleFixAll} disabled={!!fixing}>
              <Wrench className="h-3.5 w-3.5" />
              إصلاح الكل ({fixableCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-heading font-bold">صحة النظام</span>
              <span className={`text-sm font-bold ${healthScore >= 80 ? "text-primary" : healthScore >= 50 ? "text-amber-600" : "text-destructive"}`}>
                {healthScore}%
              </span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && <Badge variant="destructive" className="text-xs">{criticalCount} حرج</Badge>}
            {warningCount > 0 && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">{warningCount} تحذير</Badge>}
            {totalIssues === 0 && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">✓ سليم</Badge>}
          </div>
        </div>

        {/* Issues List */}
        {totalIssues > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {totalIssues} مشكلة تم اكتشافها
            </button>

            {expanded && (
              <div className="space-y-2 mt-2">
                {issues.map((issue) => {
                  const sev = severityConfig[issue.severity];
                  const CatIcon = categoryIcons[issue.category] || AlertTriangle;
                  const SevIcon = sev.icon;
                  const wasFixed = fixResults[issue.id] !== undefined;

                  return (
                    <div
                      key={issue.id}
                      className={`rounded-lg border p-3 ${sev.bg} ${sev.border} flex items-start gap-3`}
                    >
                      <SevIcon className={`h-4 w-4 mt-0.5 shrink-0 ${sev.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-heading font-bold">{issue.title}</span>
                          <Badge variant="outline" className="text-[9px] gap-0.5 h-4">
                            <CatIcon className="h-2.5 w-2.5" />
                            {issue.count}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                        {wasFixed && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            تم إصلاح {fixResults[issue.id]} عنصر
                          </p>
                        )}
                      </div>
                      {issue.fixable && !wasFixed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1 h-7 text-xs font-heading"
                          onClick={() => handleFix(issue)}
                          disabled={fixing === issue.id}
                        >
                          {fixing === issue.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wrench className="h-3 w-3" />
                          )}
                          إصلاح
                        </Button>
                      )}
                      {!issue.fixable && (
                        <Badge variant="outline" className="text-[9px] h-5 shrink-0">يدوي</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">جاري فحص النظام...</span>
          </div>
        )}

        {!isLoading && totalIssues === 0 && (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-primary">النظام سليم</p>
            <p className="text-xs text-muted-foreground">لم يتم اكتشاف أي مشاكل</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
