import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Save, ShieldCheck, AlertTriangle, User, Calculator, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import PositionAllowancesTab from "./PositionAllowancesTab";
import SalaryProjectionView from "@/components/salary/SalaryProjectionView";
import {
  useSalaryEquation,
  useSaveSalaryEquation,
  DEFAULT_FORMULA,
  type FormulaComponent,
} from "@/hooks/useSalaryEquation";

interface Props {
  positionId: string;
  companyId: string;
  node: {
    salaryGrade?: string;
    minSalary?: number | null;
    maxSalary?: number | null;
  };
}

export default function DrawerCompensationTab({ positionId, companyId, node }: Props) {
  const queryClient = useQueryClient();
  const { hasRole } = useRole();
  const canEdit = hasRole("hr_manager") || hasRole("admin") || hasRole("tenant_admin") || hasRole("finance_manager");

  const [gradeLevel, setGradeLevel] = useState(node.salaryGrade || "");
  const [minSalary, setMinSalary] = useState(node.minSalary ? String(node.minSalary) : "");
  const [maxSalary, setMaxSalary] = useState(node.maxSalary ? String(node.maxSalary) : "");
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  // Fetch employees assigned to this position
  const { data: assignedEmployees = [] } = useQuery({
    queryKey: ["position-employees-salary", positionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar, basic_salary, hire_date, grade_id")
        .eq("position_id", positionId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!positionId,
  });

  // Get grade info for each employee
  const firstEmp = assignedEmployees[0];
  const { data: gradeInfo } = useQuery({
    queryKey: ["emp-grade-comp", firstEmp?.grade_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("salary_grades")
        .select("*")
        .eq("id", firstEmp!.grade_id!)
        .single();
      return data as any;
    },
    enabled: !!firstEmp?.grade_id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("positions")
        .update({
          grade_level: gradeLevel ? parseInt(gradeLevel) : null,
          min_salary: minSalary ? parseFloat(minSalary) : null,
          max_salary: maxSalary ? parseFloat(maxSalary) : null,
        })
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم حفظ بيانات الراتب" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في الحفظ", variant: "destructive" }),
  });

  const minVal = minSalary ? parseFloat(minSalary) : null;
  const maxVal = maxSalary ? parseFloat(maxSalary) : null;

  if (!canEdit) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">ليس لديك صلاحية تعديل بيانات الرواتب</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        حدد الدرجة الوظيفية ونطاق الراتب والبدلات والمعادلة المخصصة.
      </p>

      {/* Salary Grade & Range */}
      <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">الدرجة الوظيفية والراتب</span>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[11px]">الدرجة الوظيفية</Label>
            <Input type="number" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="مثال: 5" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">الحد الأدنى</Label>
              <Input type="number" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} placeholder="0" className="h-9 text-sm text-left" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">الحد الأقصى</Label>
              <Input type="number" value={maxSalary} onChange={(e) => setMaxSalary(e.target.value)} placeholder="0" className="h-9 text-sm text-left" dir="ltr" />
            </div>
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="w-full gap-2">
          <Save className="h-3.5 w-3.5" />
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>

      {/* Employee Salary + Projection + Custom Equation */}
      {assignedEmployees.map((emp: any) => {
        const salary = emp.basic_salary || 0;
        const belowMin = minVal != null && salary < minVal;
        const aboveMax = maxVal != null && salary > maxVal;
        const outOfBand = belowMin || aboveMax;
        const hireDate = emp.hire_date ? new Date(emp.hire_date) : null;
        const serviceYears = hireDate ? Math.floor((Date.now() - hireDate.getTime()) / (365.25 * 86400000)) : 0;

        return (
          <EmployeeEquationPanel
            key={emp.id}
            emp={emp}
            companyId={companyId}
            salary={salary}
            serviceYears={serviceYears}
            outOfBand={outOfBand}
            belowMin={belowMin}
            aboveMax={aboveMax}
            minVal={minVal}
            maxVal={maxVal}
            gradeInfo={gradeInfo}
            isEditing={editingEmpId === emp.id}
            onToggleEdit={() => setEditingEmpId(editingEmpId === emp.id ? null : emp.id)}
          />
        );
      })}

      <Separator />
      <PositionAllowancesTab positionId={positionId} companyId={companyId} />
    </div>
  );
}

// Sub-component for each employee's equation + projection
function EmployeeEquationPanel({
  emp, companyId, salary, serviceYears, outOfBand, belowMin, aboveMax, minVal, maxVal, gradeInfo, isEditing, onToggleEdit,
}: {
  emp: any;
  companyId: string;
  salary: number;
  serviceYears: number;
  outOfBand: boolean;
  belowMin: boolean;
  aboveMax: boolean;
  minVal: number | null;
  maxVal: number | null;
  gradeInfo: any;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const { data: equation } = useSalaryEquation(companyId, emp.id);
  const saveMutation = useSaveSalaryEquation();
  const [formula, setFormula] = useState<FormulaComponent[]>(DEFAULT_FORMULA);
  const [projYears, setProjYears] = useState(5);

  useEffect(() => {
    if (equation) {
      setFormula(equation.formula?.length ? equation.formula : DEFAULT_FORMULA);
      setProjYears(equation.projection_years || 5);
    }
  }, [equation]);

  const updateComponent = (id: string, updates: Partial<FormulaComponent>) => {
    setFormula((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addComponent = () => {
    setFormula((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: "مكون جديد", type: "earning" as const, calcMode: "fixed" as const, amount: 0, enabled: true },
    ]);
  };

  const handleSave = () => {
    saveMutation.mutate(
      { companyId, employeeId: emp.id, name: `معادلة ${emp.name_ar}`, isDefault: false, formula, projectionYears: projYears },
      {
        onSuccess: () => toast({ title: "تم حفظ المعادلة المخصصة" }),
        onError: () => toast({ title: "خطأ", variant: "destructive" }),
      }
    );
  };

  const activeFormula = formula.length > 0 ? formula : DEFAULT_FORMULA;

  return (
    <div className={`rounded-xl border p-3 space-y-3 ${outOfBand ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">{emp.name_ar}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{salary.toLocaleString()} د.ع</span>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={onToggleEdit}>
          <Calculator className="h-3 w-3" />
          {isEditing ? "إغلاق" : "معادلة مخصصة"}
        </Button>
      </div>

      {outOfBand && (
        <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" />
          {belowMin && <span>أقل من الحد الأدنى ({minVal?.toLocaleString()})</span>}
          {aboveMax && <span>يتجاوز الحد الأقصى ({maxVal?.toLocaleString()})</span>}
        </div>
      )}

      {/* Custom equation editor */}
      {isEditing && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground font-medium">معادلة مخصصة لهذا الموظف (تتجاوز الافتراضية)</p>
          {formula.map((c) => (
            <div key={c.id} className={`rounded-md border p-2 text-xs ${c.type === "deduction" ? "border-destructive/20" : "border-border/50"}`}>
              <div className="flex items-center gap-1.5">
                <Switch checked={c.enabled} onCheckedChange={(v) => updateComponent(c.id, { enabled: v })} className="scale-[0.6]" />
                <Input value={c.label} onChange={(e) => updateComponent(c.id, { label: e.target.value })} className="h-6 text-[10px] border-0 bg-transparent px-0.5 w-28" />
                <Select value={c.calcMode} onValueChange={(v: any) => updateComponent(c.id, { calcMode: v })} disabled={c.id === "basic"}>
                  <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">ثابت</SelectItem>
                    <SelectItem value="percentage">نسبة%</SelectItem>
                    <SelectItem value="per_service_year">لكل سنة</SelectItem>
                    <SelectItem value="grade_linked">درجة</SelectItem>
                  </SelectContent>
                </Select>
                {c.calcMode !== "grade_linked" && (
                  <Input
                    type="number"
                    value={c.calcMode === "percentage" ? (c.percentage || 0) : c.calcMode === "per_service_year" ? (c.perYearAmount || 0) : (c.amount || 0)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (c.calcMode === "percentage") updateComponent(c.id, { percentage: val });
                      else if (c.calcMode === "per_service_year") updateComponent(c.id, { perYearAmount: val });
                      else updateComponent(c.id, { amount: val });
                    }}
                    className="h-6 text-[10px] w-20 text-left"
                    dir="ltr"
                    disabled={c.id === "basic"}
                  />
                )}
                {c.id !== "basic" && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => setFormula(f => f.filter(x => x.id !== c.id))}>
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={addComponent}>
              <Plus className="h-2.5 w-2.5" /> مكون
            </Button>
            <Button size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-2.5 w-2.5" /> حفظ
            </Button>
          </div>
        </div>
      )}

      {/* Projection */}
      <SalaryProjectionView
        formula={activeFormula}
        basicSalary={salary}
        serviceYears={serviceYears}
        projectionYears={projYears}
        gradeIncrement={gradeInfo?.annual_increment}
        gradeIncrementPct={gradeInfo?.increment_percentage}
        gradeName={gradeInfo?.grade_name}
        yearsToNextGrade={gradeInfo?.years_to_next_grade}
        compact
      />
    </div>
  );
}
