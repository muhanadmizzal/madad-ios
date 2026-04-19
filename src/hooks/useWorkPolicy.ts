import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface WorkPolicy {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  // Calendar & Working Hours
  salary_basis: string;
  standard_hours_per_day: number;
  working_days: string[];
  weekend_days: string[];
  working_hours_start: string;
  working_hours_end: string;
  late_grace_minutes: number;
  holiday_source: string;
  // Attendance Rules
  absence_definition: string;
  absence_deduction_enabled: boolean;
  late_deduction_enabled: boolean;
  late_deduction_type: string;
  late_deduction_rate: number;
  early_leave_deduction_enabled: boolean;
  early_leave_deduction_rate: number;
  overtime_enabled: boolean;
  overtime_threshold_minutes: number;
  overtime_rounding: string;
  // Leave Impact
  unpaid_leave_deduction_enabled: boolean;
  leave_impact_rules: Record<string, any>;
  // Salary Calculation
  hourly_rate_basis: string;
  proration_enabled: boolean;
  proration_basis: string;
  overtime_multiplier: number;
  holiday_work_multiplier: number;
  weekend_work_multiplier: number;
  // Deductions & Statutory
  social_security_employee_pct: number;
  social_security_employer_pct: number;
  income_tax_enabled: boolean;
  tax_mode: string;
  loan_deduction_enabled: boolean;
  custom_deduction_logic: any[];
  // Payslip Rules
  payslip_show_attendance: boolean;
  payslip_show_overtime: boolean;
  payslip_show_leave: boolean;
  payslip_custom_labels: Record<string, string>;
  payslip_language: string;
}

const DEFAULT_POLICY: Omit<WorkPolicy, "id" | "company_id"> = {
  name: "السياسة الافتراضية",
  is_default: true,
  salary_basis: "monthly_30",
  standard_hours_per_day: 8,
  working_days: ["sun", "mon", "tue", "wed", "thu"],
  weekend_days: ["fri", "sat"],
  working_hours_start: "08:00",
  working_hours_end: "16:00",
  late_grace_minutes: 10,
  holiday_source: "company",
  absence_definition: "no_attendance_no_leave",
  absence_deduction_enabled: true,
  late_deduction_enabled: true,
  late_deduction_type: "per_minute",
  late_deduction_rate: 0,
  early_leave_deduction_enabled: false,
  early_leave_deduction_rate: 0,
  overtime_enabled: true,
  overtime_threshold_minutes: 0,
  overtime_rounding: "none",
  unpaid_leave_deduction_enabled: true,
  leave_impact_rules: {},
  hourly_rate_basis: "daily_divided",
  proration_enabled: true,
  proration_basis: "calendar_days",
  overtime_multiplier: 1.5,
  holiday_work_multiplier: 2.0,
  weekend_work_multiplier: 1.5,
  social_security_employee_pct: 5.0,
  social_security_employer_pct: 12.0,
  income_tax_enabled: true,
  tax_mode: "iraqi_brackets",
  loan_deduction_enabled: true,
  custom_deduction_logic: [],
  payslip_show_attendance: true,
  payslip_show_overtime: true,
  payslip_show_leave: true,
  payslip_custom_labels: {},
  payslip_language: "ar",
};

function parsePolicy(raw: any): WorkPolicy {
  return {
    id: raw.id,
    company_id: raw.company_id,
    name: raw.name || DEFAULT_POLICY.name,
    description: raw.description,
    is_default: raw.is_default ?? true,
    salary_basis: raw.salary_basis || DEFAULT_POLICY.salary_basis,
    standard_hours_per_day: raw.standard_hours_per_day ?? DEFAULT_POLICY.standard_hours_per_day,
    working_days: raw.working_days || DEFAULT_POLICY.working_days,
    weekend_days: raw.weekend_days || DEFAULT_POLICY.weekend_days,
    working_hours_start: raw.working_hours_start || DEFAULT_POLICY.working_hours_start,
    working_hours_end: raw.working_hours_end || DEFAULT_POLICY.working_hours_end,
    late_grace_minutes: raw.late_grace_minutes ?? DEFAULT_POLICY.late_grace_minutes,
    holiday_source: raw.holiday_source || DEFAULT_POLICY.holiday_source,
    absence_definition: raw.absence_definition || DEFAULT_POLICY.absence_definition,
    absence_deduction_enabled: raw.absence_deduction_enabled ?? DEFAULT_POLICY.absence_deduction_enabled,
    late_deduction_enabled: raw.late_deduction_enabled ?? DEFAULT_POLICY.late_deduction_enabled,
    late_deduction_type: raw.late_deduction_type || DEFAULT_POLICY.late_deduction_type,
    late_deduction_rate: raw.late_deduction_rate ?? DEFAULT_POLICY.late_deduction_rate,
    early_leave_deduction_enabled: raw.early_leave_deduction_enabled ?? DEFAULT_POLICY.early_leave_deduction_enabled,
    early_leave_deduction_rate: raw.early_leave_deduction_rate ?? DEFAULT_POLICY.early_leave_deduction_rate,
    overtime_enabled: raw.overtime_enabled ?? DEFAULT_POLICY.overtime_enabled,
    overtime_threshold_minutes: raw.overtime_threshold_minutes ?? DEFAULT_POLICY.overtime_threshold_minutes,
    overtime_rounding: raw.overtime_rounding || DEFAULT_POLICY.overtime_rounding,
    unpaid_leave_deduction_enabled: raw.unpaid_leave_deduction_enabled ?? DEFAULT_POLICY.unpaid_leave_deduction_enabled,
    leave_impact_rules: raw.leave_impact_rules || DEFAULT_POLICY.leave_impact_rules,
    hourly_rate_basis: raw.hourly_rate_basis || DEFAULT_POLICY.hourly_rate_basis,
    proration_enabled: raw.proration_enabled ?? DEFAULT_POLICY.proration_enabled,
    proration_basis: raw.proration_basis || DEFAULT_POLICY.proration_basis,
    overtime_multiplier: raw.overtime_multiplier ?? DEFAULT_POLICY.overtime_multiplier,
    holiday_work_multiplier: raw.holiday_work_multiplier ?? DEFAULT_POLICY.holiday_work_multiplier,
    weekend_work_multiplier: raw.weekend_work_multiplier ?? DEFAULT_POLICY.weekend_work_multiplier,
    social_security_employee_pct: raw.social_security_employee_pct ?? DEFAULT_POLICY.social_security_employee_pct,
    social_security_employer_pct: raw.social_security_employer_pct ?? DEFAULT_POLICY.social_security_employer_pct,
    income_tax_enabled: raw.income_tax_enabled ?? DEFAULT_POLICY.income_tax_enabled,
    tax_mode: raw.tax_mode || DEFAULT_POLICY.tax_mode,
    loan_deduction_enabled: raw.loan_deduction_enabled ?? DEFAULT_POLICY.loan_deduction_enabled,
    custom_deduction_logic: raw.custom_deduction_logic || DEFAULT_POLICY.custom_deduction_logic,
    payslip_show_attendance: raw.payslip_show_attendance ?? DEFAULT_POLICY.payslip_show_attendance,
    payslip_show_overtime: raw.payslip_show_overtime ?? DEFAULT_POLICY.payslip_show_overtime,
    payslip_show_leave: raw.payslip_show_leave ?? DEFAULT_POLICY.payslip_show_leave,
    payslip_custom_labels: raw.payslip_custom_labels || DEFAULT_POLICY.payslip_custom_labels,
    payslip_language: raw.payslip_language || DEFAULT_POLICY.payslip_language,
  };
}

export { DEFAULT_POLICY };

/** Get all policies for the tenant */
export function useWorkPolicies() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["work-policies", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_policies")
        .select("*")
        .eq("company_id", companyId!)
        .order("is_default", { ascending: false });
      return (data || []).map((r: any) => parsePolicy(r));
    },
    enabled: !!companyId,
  });
}

/** Get default policy */
export function useDefaultWorkPolicy() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["work-policy-default", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_policies")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_default", true)
        .maybeSingle();
      if (!data) return { ...DEFAULT_POLICY, id: "", company_id: companyId! } as WorkPolicy;
      return parsePolicy(data);
    },
    enabled: !!companyId,
  });
}

/** Get policy assignments */
export function usePolicyAssignments() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["policy-assignments", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("policy_assignments")
        .select("*, payroll_policies(name)")
        .eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });
}

/** Resolve the effective policy for an employee */
export function resolveEmployeePolicy(
  employee: any,
  policies: WorkPolicy[],
  assignments: any[]
): WorkPolicy {
  // Check employee-specific assignment first
  const empAssign = assignments.find(
    (a) => a.assignment_type === "employee" && a.assignment_target_id === employee.id
  );
  if (empAssign) {
    const p = policies.find((pol) => pol.id === empAssign.policy_id);
    if (p) return p;
  }

  // Check department assignment
  if (employee.department_id) {
    const deptAssign = assignments.find(
      (a) => a.assignment_type === "department" && a.assignment_target_id === employee.department_id
    );
    if (deptAssign) {
      const p = policies.find((pol) => pol.id === deptAssign.policy_id);
      if (p) return p;
    }
  }

  // Check branch assignment
  if (employee.branch_id) {
    const branchAssign = assignments.find(
      (a) => a.assignment_type === "branch" && a.assignment_target_id === employee.branch_id
    );
    if (branchAssign) {
      const p = policies.find((pol) => pol.id === branchAssign.policy_id);
      if (p) return p;
    }
  }

  // Check contract_type assignment
  if (employee.contract_type) {
    const ctAssign = assignments.find(
      (a) => a.assignment_type === "contract_type" && a.assignment_target_id === employee.contract_type
    );
    if (ctAssign) {
      const p = policies.find((pol) => pol.id === ctAssign.policy_id);
      if (p) return p;
    }
  }

  // Fallback to default
  return policies.find((pol) => pol.is_default) || policies[0] || ({ ...DEFAULT_POLICY, id: "", company_id: employee.company_id } as WorkPolicy);
}
