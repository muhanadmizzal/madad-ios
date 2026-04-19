import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, TrendingUp, Users, Building2, GitBranch, ChevronUp } from "lucide-react";
import { useManagerChain } from "@/hooks/useManagerChain";
import { useSalaryEquation, DEFAULT_FORMULA } from "@/hooks/useSalaryEquation";
import SalaryProjectionView from "@/components/salary/SalaryProjectionView";

interface Props {
  employee: any;
  companyId: string;
}

export function EmployeeServiceInfo({ employee, companyId }: Props) {
  // Get salary equation (employee-specific or company default)
  const { data: equation } = useSalaryEquation(companyId, employee.id);
  // Get position info
  const { data: position } = useQuery({
    queryKey: ["emp-position", employee.position_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("*, departments(name)")
        .eq("id", employee.position_id!)
        .single();
      return data;
    },
    enabled: !!employee.position_id,
  });

  // Get full manager chain
  const { data: managerChain = [] } = useManagerChain(employee.position_id, companyId);

  // Get subordinates
  const { data: subordinates = [] } = useQuery({
    queryKey: ["emp-subordinates", employee.position_id, companyId],
    queryFn: async () => {
      if (!employee.position_id) return [];
      // Get child positions
      const { data: childPositions } = await supabase
        .from("positions")
        .select("id")
        .eq("parent_position_id", employee.position_id)
        .eq("company_id", companyId);
      if (!childPositions?.length) return [];
      const posIds = childPositions.map((p: any) => p.id);
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar, position, avatar_url")
        .in("position_id", posIds)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!employee.position_id,
  });

  // Get career history
  const { data: careerHistory = [] } = useQuery({
    queryKey: ["emp-career-history", employee.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("career_history")
        .select("*")
        .eq("employee_id", employee.id)
        .order("effective_date", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Get salary grade
  const { data: grade } = useQuery({
    queryKey: ["emp-grade", employee.grade_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("salary_grades")
        .select("*")
        .eq("id", employee.grade_id)
        .single();
      return data as any;
    },
    enabled: !!employee.grade_id,
  });

  // Calculate service years
  const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;
  const now = new Date();
  const serviceYears = hireDate ? Math.floor((now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
  const serviceMonths = hireDate ? Math.floor(((now.getTime() - hireDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) % 12) : 0;

  const posTitle = position?.title_ar || position?.title || employee.position || "—";
  const deptName = position?.departments?.name || employee.departments?.name || "—";

  return (
    <div className="space-y-4">
      {/* Service Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Calendar className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="font-heading font-bold text-lg text-primary">{serviceYears}</p>
            <p className="text-[10px] text-muted-foreground">سنة خدمة {serviceMonths > 0 && `و ${serviceMonths} شهر`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Briefcase className="h-4 w-4 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-sm truncate">{posTitle}</p>
            <p className="text-[10px] text-muted-foreground">المنصب الحالي</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Building2 className="h-4 w-4 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-sm truncate">{deptName}</p>
            <p className="text-[10px] text-muted-foreground">القسم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-foreground mb-1" />
            <p className="font-heading font-bold text-sm">{grade?.grade_name || "—"}</p>
            <p className="text-[10px] text-muted-foreground">الدرجة</p>
          </CardContent>
        </Card>
      </div>

      {/* Manager Chain (full hierarchy) */}
      {managerChain.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-heading font-bold text-muted-foreground mb-3 flex items-center gap-1">
              <ChevronUp className="h-3 w-3" /> سلسلة القيادة ({managerChain.length} مستوى)
            </p>
            <div className="relative pr-5 space-y-0">
              <div className="absolute right-[9px] top-2 bottom-2 w-px bg-border" />
              {managerChain.map((node, idx) => (
                <div key={node.positionId} className="relative flex items-center gap-2.5 py-1.5">
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-2 z-10 flex items-center justify-center text-[8px] font-bold ${
                    idx === 0
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="mr-4 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {node.isVacant ? (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] shrink-0">ش</div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {node.employeeName?.[0] || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {node.isVacant ? "شاغر" : node.employeeName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {node.positionTitle}
                          {node.departmentName && ` • ${node.departmentName}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <Badge variant="outline" className="text-[9px] shrink-0 border-primary/30 text-primary">
                      مباشر
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team / Subordinates */}
      {subordinates.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-heading font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" /> الفريق ({subordinates.length})
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {subordinates.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                    {s.name_ar[0]}
                  </div>
                  <span className="truncate">{s.name_ar}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary Projection (equation-based) */}
      {(employee.basic_salary || 0) > 0 && (
        <SalaryProjectionView
          formula={equation?.formula || DEFAULT_FORMULA}
          basicSalary={employee.basic_salary || 0}
          serviceYears={serviceYears}
          projectionYears={equation?.projection_years || 5}
          gradeIncrement={grade?.annual_increment}
          gradeIncrementPct={grade?.increment_percentage}
          gradeName={grade?.grade_name}
          yearsToNextGrade={grade?.years_to_next_grade}
        />
      )}

      {/* Career Path */}
      {careerHistory.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-heading font-bold text-muted-foreground mb-2">المسار الوظيفي</p>
            <div className="relative pr-4 space-y-2">
              <div className="absolute right-1.5 top-0 bottom-0 w-px bg-border" />
              {careerHistory.slice(0, 5).map((ch: any) => (
                <div key={ch.id} className="relative flex gap-2 text-sm">
                  <div className="absolute right-0 top-1.5 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary z-10" />
                  <div className="mr-4">
                    <p className="font-medium">
                      {ch.event_type === "promotion" && "ترقية"}
                      {ch.event_type === "transfer" && "نقل"}
                      {ch.event_type === "salary_change" && "تعديل راتب"}
                      {ch.event_type === "grade_change" && "تغيير درجة"}
                      {!["promotion", "transfer", "salary_change", "grade_change"].includes(ch.event_type) && ch.event_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ch.from_position && `${ch.from_position} ← `}{ch.to_position || ""}
                      {ch.from_salary && ch.to_salary && ` | ${Number(ch.from_salary).toLocaleString()} → ${Number(ch.to_salary).toLocaleString()}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{ch.effective_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
