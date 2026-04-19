import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Users, AlertCircle, ExternalLink, Briefcase, ChevronUp, ChevronDown,
  Building2, GitBranch, ArrowRightLeft, UserPlus, Link2Off, AlertTriangle,
  MapPin, Crown, Hash, Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { OrgNodeData } from "../OrgChartNode";
import { useManagerChain } from "@/hooks/useManagerChain";
import DirectManagerCard from "@/components/employees/DirectManagerCard";

interface Props {
  node: OrgNodeData;
  companyId: string;
  onTransfer?: (employeeId: string, employeeName: string, currentPositionId?: string) => void;
}

export default function DrawerEmployeesTab({ node, companyId, onTransfer }: Props) {
  const navigate = useNavigate();

  // Fetch position details for structural context
  const { data: positionDetail } = useQuery({
    queryKey: ["drawer-position-detail", node.positionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("*, departments(name, level, branches(name))")
        .eq("id", node.positionId!)
        .single();
      return data;
    },
    enabled: !!node.positionId,
  });

  // Get the first assigned employee's department as fallback
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["drawer-employees", companyId, node.positionId, node.departmentId, node.type],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("id, name_ar, employee_code, avatar_url, status, position, basic_salary, position_id, grade_id, hire_date, department_id, departments(name)")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("name_ar");

      if (node.type === "position" && node.positionId) {
        query = query.eq("position_id", node.positionId);
      } else if (node.type === "department" && node.departmentId) {
        query = query.eq("department_id", node.departmentId);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Resolve the effective department: position's department OR employee's department
  const employeeDeptId = employees.length > 0 ? (employees[0] as any)?.department_id : null;
  const effectiveDeptId = positionDetail?.department_id || employeeDeptId;

  const { data: managerChain = [] } = useManagerChain(node.positionId, companyId, employeeDeptId);


  // Fetch subordinates (direct reports under this position)
  const { data: subordinates = [] } = useQuery({
    queryKey: ["drawer-subordinates", companyId, node.positionId],
    queryFn: async () => {
      if (!node.positionId) return [];
      const { data: childPositions } = await supabase
        .from("positions")
        .select("id, title_ar, title, status")
        .eq("parent_position_id", node.positionId)
        .eq("company_id", companyId);
      if (!childPositions?.length) return [];
      const posIds = childPositions.map((p: any) => p.id);
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name_ar, employee_code, avatar_url, position, position_id, status")
        .in("position_id", posIds)
        .eq("status", "active");

      return childPositions.map((pos: any) => {
        const emp = emps?.find((e: any) => e.position_id === pos.id);
        return {
          positionId: pos.id,
          positionTitle: pos.title_ar || pos.title || "—",
          positionStatus: pos.status,
          employee: emp || null,
        };
      });
    },
    enabled: !!node.positionId && node.type === "position",
  });


  // Fetch department details for department nodes
  const { data: deptDetail } = useQuery({
    queryKey: ["drawer-dept-detail", node.departmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("departments")
        .select("*, branches(name), parent:departments!departments_parent_department_id_fkey(name)")
        .eq("id", node.departmentId!)
        .single();
      return data;
    },
    enabled: !!node.departmentId && node.type === "department",
  });

  const directManager = managerChain.length > 0 ? managerChain[0] : null;
  const empDept = employees.length > 0 ? (employees[0] as any)?.departments : null;
  const dept = positionDetail?.departments as any || empDept;
  const branch = dept?.branches as any;

  // Structural warnings
  const warnings: string[] = [];
  if (node.type === "position" && !directManager && !node.isManager) {
    warnings.push("لا يوجد مدير مباشر مرتبط حالياً");
  }
  if (node.type === "position" && !effectiveDeptId) {
    warnings.push("المنصب غير مرتبط بقسم");
  }
  if (node.type === "position" && employees.length === 0 && node.status !== "vacant") {
    warnings.push("لا يوجد موظف معين رغم أن الحالة ليست شاغرة");
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ═══ Warnings / Integrity Alerts ═══ */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-destructive/5 border border-destructive/15">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive font-medium">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Section 1: Reporting Line (سلسلة الارتباط الإداري) ═══ */}
      {node.type === "position" && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-heading font-bold text-foreground">سلسلة الارتباط الإداري</p>
                <p className="text-[10px] text-muted-foreground">الموقع في الهيكل التنظيمي</p>
              </div>
            </div>

            {/* Structural breadcrumb */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 px-1">
              {branch?.name && (
                <>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted/30">
                    <MapPin className="h-2.5 w-2.5" />{branch.name}
                  </Badge>
                  <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
                </>
              )}
              {dept?.name && (
                <>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-muted/30">
                    <Building2 className="h-2.5 w-2.5" />{dept.name}
                  </Badge>
                  <ChevronDown className="h-3 w-3 text-muted-foreground rotate-[-90deg]" />
                </>
              )}
              <Badge variant="secondary" className="text-[10px] gap-1 font-bold">
                <Briefcase className="h-2.5 w-2.5" />{node.label}
              </Badge>
            </div>

            {/* Direct Manager Card (unified) */}
            <DirectManagerCard positionId={node.positionId} companyId={companyId} employeeDepartmentId={employeeDeptId} />

            {/* Full chain (if > 1 level) */}
            {managerChain.length > 1 && (
              <Card className="border-border/60 shadow-sm mt-3">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitBranch className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-heading font-bold text-muted-foreground">
                      سلسلة القيادة ({managerChain.length} مستوى)
                    </span>
                  </div>
                  <div className="relative pr-6 space-y-0">
                    <div className="absolute right-[11px] top-3 bottom-3 w-px bg-border" />
                    {managerChain.map((m, idx) => (
                      <div key={m.positionId} className="relative flex items-center gap-3 py-2 group">
                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full border-2 z-10 flex items-center justify-center text-[9px] font-bold transition-colors ${
                          idx === 0
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground group-hover:border-primary/40"
                        }`}>
                          {managerChain.length - idx}
                        </div>
                        <div className="mr-5 min-w-0 flex-1 flex items-center gap-2.5">
                          {m.isVacant ? (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0 border border-dashed border-muted-foreground/30">ش</div>
                          ) : (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading">{m.employeeName?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{m.isVacant ? "شاغر" : m.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{m.positionTitle}{m.departmentName && ` • ${m.departmentName}`}</p>
                          </div>
                        </div>
                        {idx === 0 && (
                          <Badge variant="outline" className="text-[9px] shrink-0 border-primary/30 text-primary bg-primary/5">
                            <Crown className="h-2.5 w-2.5 ml-0.5" />مدير مباشر
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Section 2: Assigned Employee(s) ═══ */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-heading font-bold text-foreground">
                  {node.type === "position" ? "الموظف المعين" : `الموظفين (${employees.length})`}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{employees.length} موظف</Badge>
          </div>

          {employees.length > 0 ? (
            <div className="space-y-2">
              {employees.map((emp) => {
                const serviceYears = emp.hire_date
                  ? Math.floor((Date.now() - new Date(emp.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : null;
                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group"
                    onClick={() => navigate(`/employees?id=${emp.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-heading">
                          {emp.name_ar?.charAt(0) || "م"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-heading font-bold text-foreground truncate">{emp.name_ar}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {emp.employee_code && (
                            <Badge variant="outline" className="text-[9px] font-mono h-4 px-1.5">
                              <Hash className="h-2 w-2 ml-0.5" />{emp.employee_code}
                            </Badge>
                          )}
                          {emp.position && (
                            <span className="text-[10px] text-muted-foreground">{emp.position}</span>
                          )}
                          {serviceYears !== null && serviceYears > 0 && (
                            <span className="text-[10px] text-muted-foreground">{serviceYears} سنة</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onTransfer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); onTransfer(emp.id, emp.name_ar || "", node.positionId); }}
                        >
                          <ArrowRightLeft className="h-3 w-3" />نقل
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 rounded-xl bg-muted/10">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground font-heading">لا يوجد موظفين حالياً</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {node.type === "position" ? "هذا المنصب شاغر" : "لم يتم تعيين موظفين لهذا القسم"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Section 3: Direct Team (الفريق المباشر) ═══ */}
      {node.type === "position" && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ChevronDown className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-heading font-bold text-foreground">الفريق المباشر</p>
                  <p className="text-[10px] text-muted-foreground">المناصب والموظفين تحت هذا المنصب</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {subordinates.length} منصب
              </Badge>
            </div>

            {subordinates.length > 0 ? (
              <div className="space-y-1.5">
                {subordinates.map((sub: any) => (
                  <div
                    key={sub.positionId}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer"
                    onClick={() => sub.employee && navigate(`/employees?id=${sub.employee.id}`)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sub.employee ? (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading">
                            {sub.employee.name_ar?.[0] || "م"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                          ش
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sub.employee ? sub.employee.name_ar : "شاغر"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {sub.positionTitle}
                          {sub.employee?.employee_code && ` • ${sub.employee.employee_code}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={sub.employee ? "default" : "secondary"}
                        className="text-[9px] h-5"
                      >
                        {sub.employee ? "مشغول" : "شاغر"}
                      </Badge>
                      {sub.employee && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 rounded-xl bg-muted/10">
                <Users className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground">لا يوجد فريق مباشر</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">لا توجد مناصب تتبع هذا المنصب مباشرة</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Position inheritance notice ═══ */}
      {node.type === "position" && employees.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-center gap-2.5">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <div>
            <span className="text-xs text-primary font-heading font-bold">
              الصلاحيات وسير العمل موروثة من المنصب
            </span>
            <p className="text-[10px] text-primary/70 mt-0.5">
              {node.label} — الدرجة: {node.salaryGrade || "—"} • {node.permissionsCount || 0} خدمة • {node.workflowRoles || 0} سير عمل
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
