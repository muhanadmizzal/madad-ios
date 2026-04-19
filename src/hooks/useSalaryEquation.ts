import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FormulaComponent {
  id: string;
  label: string;
  type: "earning" | "deduction";
  calcMode: "fixed" | "percentage" | "per_service_year" | "grade_linked";
  amount?: number;
  percentage?: number;        // % of basic_salary
  perYearAmount?: number;     // amount * service_years
  enabled: boolean;
}

export interface SalaryEquation {
  id: string;
  company_id: string;
  employee_id: string | null;
  name: string;
  is_default: boolean;
  formula: FormulaComponent[];
  projection_years: number;
  notes: string | null;
}

export const DEFAULT_FORMULA: FormulaComponent[] = [
  { id: "basic", label: "الراتب الأساسي", type: "earning", calcMode: "fixed", amount: 0, enabled: true },
  { id: "housing", label: "بدل سكن", type: "earning", calcMode: "percentage", percentage: 25, enabled: true },
  { id: "transport", label: "بدل نقل", type: "earning", calcMode: "fixed", amount: 50000, enabled: true },
  { id: "service_bonus", label: "علاوة خدمة", type: "earning", calcMode: "per_service_year", perYearAmount: 10000, enabled: true },
  { id: "annual_increment", label: "العلاوة السنوية", type: "earning", calcMode: "grade_linked", enabled: true },
  { id: "tax", label: "ضريبة الدخل", type: "deduction", calcMode: "percentage", percentage: 5, enabled: false },
  { id: "insurance", label: "تأمينات", type: "deduction", calcMode: "percentage", percentage: 3, enabled: true },
];

export function calculateSalary(
  formula: FormulaComponent[],
  basicSalary: number,
  serviceYears: number,
  gradeIncrement?: number | null,
  gradeIncrementPct?: number | null,
): { total: number; earnings: number; deductions: number; breakdown: { label: string; amount: number; type: string }[] } {
  let earnings = 0;
  let deductions = 0;
  const breakdown: { label: string; amount: number; type: string }[] = [];

  for (const c of formula) {
    if (!c.enabled) continue;
    let amt = 0;

    switch (c.calcMode) {
      case "fixed":
        amt = c.id === "basic" ? basicSalary : (c.amount || 0);
        break;
      case "percentage":
        amt = basicSalary * ((c.percentage || 0) / 100);
        break;
      case "per_service_year":
        amt = (c.perYearAmount || 0) * serviceYears;
        break;
      case "grade_linked":
        if (gradeIncrement && gradeIncrement > 0) {
          amt = gradeIncrement;
        } else if (gradeIncrementPct && gradeIncrementPct > 0) {
          amt = basicSalary * (gradeIncrementPct / 100);
        }
        break;
    }

    amt = Math.round(amt);
    if (c.type === "earning") earnings += amt;
    else deductions += amt;
    breakdown.push({ label: c.label, amount: amt, type: c.type });
  }

  return { total: earnings - deductions, earnings, deductions, breakdown };
}

export function projectSalary(
  formula: FormulaComponent[],
  basicSalary: number,
  currentServiceYears: number,
  years: number,
  gradeIncrement?: number | null,
  gradeIncrementPct?: number | null,
  gradeName?: string,
  yearsToNextGrade?: number | null,
): { year: number; serviceYears: number; basicSalary: number; total: number; grade: string }[] {
  const projections: { year: number; serviceYears: number; basicSalary: number; total: number; grade: string }[] = [];
  let currentBasic = basicSalary;
  let currentGrade = gradeName || "—";

  for (let y = 0; y <= years; y++) {
    const sy = currentServiceYears + y;
    const calc = calculateSalary(formula, currentBasic, sy, gradeIncrement, gradeIncrementPct);
    projections.push({
      year: new Date().getFullYear() + y,
      serviceYears: sy,
      basicSalary: currentBasic,
      total: calc.total,
      grade: currentGrade,
    });

    // Apply annual increment for next year
    if (gradeIncrement && gradeIncrement > 0) {
      currentBasic += gradeIncrement;
    } else if (gradeIncrementPct && gradeIncrementPct > 0) {
      currentBasic = Math.round(currentBasic * (1 + gradeIncrementPct / 100));
    }

    // Grade promotion
    if (yearsToNextGrade && sy - currentServiceYears >= yearsToNextGrade) {
      currentGrade = `${currentGrade} (ترقية)`;
    }
  }

  return projections;
}

export function useSalaryEquation(companyId: string | null, employeeId?: string | null) {
  return useQuery<SalaryEquation | null>({
    queryKey: ["salary-equation", companyId, employeeId],
    queryFn: async () => {
      if (!companyId) return null;

      // Try employee-specific first
      if (employeeId) {
        const { data: empEq } = await (supabase as any)
          .from("salary_equations")
          .select("*")
          .eq("company_id", companyId)
          .eq("employee_id", employeeId)
          .maybeSingle();
        if (empEq) return { ...empEq, formula: empEq.formula || DEFAULT_FORMULA } as SalaryEquation;
      }

      // Fall back to company default
      const { data: defEq } = await (supabase as any)
        .from("salary_equations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_default", true)
        .is("employee_id", null)
        .maybeSingle();

      if (defEq) return { ...defEq, formula: defEq.formula || DEFAULT_FORMULA } as SalaryEquation;
      return null;
    },
    enabled: !!companyId,
  });
}

export function useSaveSalaryEquation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eq: { companyId: string; employeeId?: string | null; name: string; isDefault: boolean; formula: FormulaComponent[]; projectionYears: number }) => {
      const payload = {
        company_id: eq.companyId,
        employee_id: eq.employeeId || null,
        name: eq.name,
        is_default: eq.isDefault,
        formula: eq.formula as any,
        projection_years: eq.projectionYears,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await (supabase as any)
        .from("salary_equations")
        .select("id")
        .eq("company_id", eq.companyId)
        .match(eq.employeeId ? { employee_id: eq.employeeId } : { is_default: true, employee_id: null })
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any).from("salary_equations").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("salary_equations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-equation"] });
    },
  });
}
