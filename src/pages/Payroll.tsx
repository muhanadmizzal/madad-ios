import { useState } from "react";
import { Wallet, Calculator, FileText, PlayCircle, Download, FileSpreadsheet, CheckCircle, CreditCard, Eye, Receipt, Send, Settings2, BarChart3, RotateCcw, Building, ChevronDown, ChevronUp, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { PayslipDialog } from "@/components/payroll/PayslipDialog";
import { InlinePayslip } from "@/components/payroll/InlinePayslip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { exportPayrollToExcel, exportPayrollToPDF, exportBankTransferFile } from "@/lib/export-utils";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";
import { PayrollWorkflowTimeline } from "@/components/payroll/PayrollWorkflowTimeline";
import { CurrentApproverBadge } from "@/components/approvals/CurrentApproverBadge";
import { useWorkPolicies, usePolicyAssignments, resolveEmployeePolicy } from "@/hooks/useWorkPolicy";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function calculateIraqiIncomeTax(annualTaxableIncome: number): number {
  let tax = 0;
  let remaining = annualTaxableIncome;
  const brackets = [
    { limit: 250000, rate: 0.03 },
    { limit: 250000, rate: 0.05 },
    { limit: 500000, rate: 0.10 },
    { limit: Infinity, rate: 0.15 },
  ];
  for (const b of brackets) {
    const taxable = Math.min(remaining, b.limit);
    tax += taxable * b.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return tax / 12;
}

const statusLabels: Record<string, string> = { draft: "مسودة", processing: "قيد المعالجة", approved: "معتمد", paid: "مدفوع" };
const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-accent/10 text-accent-foreground",
  approved: "bg-primary/10 text-primary",
  paid: "bg-primary/20 text-primary",
};

export default function Payroll() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();

  const [selectedBranchId, setSelectedBranchId] = useState<string>("__all__");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-payroll", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("company_id", companyId!).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name), branches(name), positions(grade_level)").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const filteredEmployees = selectedBranchId === "__all__"
    ? employees
    : selectedBranchId === "__none__"
      ? employees.filter((e: any) => !e.branch_id)
      : employees.filter((e: any) => e.branch_id === selectedBranchId);

  const { data: salaryComponents = [] } = useQuery({
    queryKey: ["salary-components-payroll", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("salary_components").select("*").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: empSalaryComponents = [] } = useQuery({
    queryKey: ["emp-salary-components-payroll", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_components").select("*, salary_components(*)");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: activeLoans = [] } = useQuery({
    queryKey: ["active-loans-payroll", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ["payroll-runs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_runs")
        .select("*, branches(name)")
        .eq("company_id", companyId!)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Get workflow instances for all payroll runs to show status alignment
  const { data: payrollWorkflows = [] } = useQuery({
    queryKey: ["payroll-workflow-instances", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_instances")
        .select("id, reference_id, status, current_step_order, template_id, requester_user_id")
        .eq("company_id", companyId!)
        .eq("request_type", "payroll")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: policy } = useQuery({
    queryKey: ["payroll-policy", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_policies").select("*").eq("company_id", companyId!).eq("is_default", true).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: allPolicies = [] } = useWorkPolicies();
  const { data: policyAssignments = [] } = usePolicyAssignments();

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [payslipItem, setPayslipItem] = useState<any>(null);
  const [payslipOpen, setPayslipOpen] = useState(false);
  const [inlinePayslipId, setInlinePayslipId] = useState<string | null>(null);
  const [showAllPayslips, setShowAllPayslips] = useState(false);
  const activeRunId = selectedRunId || payrollRuns?.[0]?.id;

  const { data: currentPayrollItems = [] } = useQuery({
    queryKey: ["payroll-items", activeRunId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_items")
        .select("*, employees(name_ar)")
        .eq("payroll_run_id", activeRunId!);
      return data || [];
    },
    enabled: !!activeRunId,
  });

  // Direct payroll run — computes from attendance/leave/policy and stores in DB
  const runPayrollDirect = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      if (filteredEmployees.length === 0) throw new Error("لا يوجد موظفون في هذا الفرع");

      const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const lastOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Fetch attendance, leave, holidays in parallel
      const [attRes, leaveRes, holRes] = await Promise.all([
        supabase.from("attendance_records").select("*").eq("company_id", companyId!).gte("date", firstOfMonth).lte("date", lastOfMonth),
        supabase.from("leave_requests").select("*, leave_types(is_paid)").eq("company_id", companyId!).eq("status", "approved").lte("start_date", lastOfMonth).gte("end_date", firstOfMonth),
        supabase.from("public_holidays").select("date").eq("company_id", companyId!).gte("date", firstOfMonth).lte("date", lastOfMonth),
      ]);
      const attendanceRecords = attRes.data || [];
      const leaveRequests = leaveRes.data || [];
      const holidayDates = new Set((holRes.data || []).map((h: any) => h.date));

      // Create payroll run
      const branchId = selectedBranchId !== "__all__" && selectedBranchId !== "__none__" ? selectedBranchId : null;
      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .insert({ company_id: companyId!, month, year, created_by: user!.id, branch_id: branchId } as any)
        .select().single();
      if (runError) throw runError;

      let totalGross = 0, totalDeductions = 0, totalNet = 0;
      const items: any[] = [];
      const summaries: any[] = [];

      for (const emp of filteredEmployees) {
        const p: any = allPolicies.length > 0
          ? resolveEmployeePolicy(emp, allPolicies, policyAssignments) : {};

        const basic = emp.basic_salary || 0;
        const standardHours = p.standard_hours_per_day || 8;
        const graceMin = p.late_grace_minutes || 10;
        const weekendDaySet = new Set((p.weekend_days || ["fri", "sat"]).map((d: string) => {
          const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
          return map[d] ?? -1;
        }));

        // Working days
        let workingDays = 0;
        const d = new Date(firstOfMonth);
        while (d.getMonth() + 1 === month && d.getFullYear() === year) {
          const dow = d.getDay();
          const dateStr = d.toISOString().split("T")[0];
          if (!weekendDaySet.has(dow) && !holidayDates.has(dateStr)) workingDays++;
          d.setDate(d.getDate() + 1);
        }

        let dailyRate: number;
        if (p.salary_basis === "monthly_calendar") dailyRate = basic / lastDay;
        else if (p.salary_basis === "monthly_working") dailyRate = workingDays > 0 ? basic / workingDays : 0;
        else dailyRate = basic / 30;
        const hourlyRate = dailyRate / standardHours;

        const empRecords = attendanceRecords.filter((r: any) => r.employee_id === emp.id);
        const workedDays = empRecords.length;
        let totalOT = 0, lateMinutes = 0, lateIncidents = 0, earlyLeaveMinutes = 0;
        let weekendHours = 0, holidayHours = 0;

        empRecords.forEach((r: any) => {
          totalOT += r.overtime_hours || 0;
          if (r.check_in) {
            const ci = new Date(r.check_in);
            const startHour = parseInt(p?.working_hours_start?.split(":")[0] || "8");
            const startMin = parseInt(p?.working_hours_start?.split(":")[1] || "0");
            const lateMin = (ci.getHours() * 60 + ci.getMinutes()) - (startHour * 60 + startMin);
            if (lateMin > graceMin) { lateMinutes += lateMin; lateIncidents++; }
          }
          if (r.check_out) {
            const co = new Date(r.check_out);
            const endHour = parseInt(p?.working_hours_end?.split(":")[0] || "16");
            const endMin = parseInt(p?.working_hours_end?.split(":")[1] || "0");
            const earlyMin = (endHour * 60 + endMin) - (co.getHours() * 60 + co.getMinutes());
            if (earlyMin > 0) earlyLeaveMinutes += earlyMin;
          }
          const rd = new Date(r.date);
          if (weekendDaySet.has(rd.getDay())) weekendHours += r.hours_worked || standardHours;
          if (holidayDates.has(r.date)) holidayHours += r.hours_worked || standardHours;
        });

        // Leave
        let paidLeaveDays = 0, unpaidLeaveDays = 0;
        leaveRequests.filter((lr: any) => lr.employee_id === emp.id).forEach((lr: any) => {
          const start = new Date(Math.max(new Date(lr.start_date).getTime(), new Date(firstOfMonth).getTime()));
          const end = new Date(Math.min(new Date(lr.end_date).getTime(), new Date(lastOfMonth).getTime()));
          const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
          const halfDay = lr.is_half_day ? 0.5 : days;
          if (lr.leave_types?.is_paid) paidLeaveDays += halfDay; else unpaidLeaveDays += halfDay;
        });

        const absentDays = Math.max(0, workingDays - workedDays - paidLeaveDays - unpaidLeaveDays);

        // Proration
        let proratedBasic = basic;
        if (p.proration_enabled && emp.hire_date) {
          const hd = new Date(emp.hire_date);
          if (hd.getFullYear() === year && hd.getMonth() + 1 === month && hd.getDate() > 1) {
            const dw = p.proration_basis === "working_days"
              ? Math.max(0, workingDays - Math.round((hd.getDate() - 1) * workingDays / lastDay))
              : lastDay - hd.getDate() + 1;
            const tb = p.proration_basis === "working_days" ? workingDays : lastDay;
            proratedBasic = tb > 0 ? Math.round((basic / tb) * dw * 100) / 100 : 0;
          }
        }

        // Salary components
        const empComps = empSalaryComponents.filter((c: any) => c.employee_id === emp.id);
        let allowances = 0, extraDeductions = 0;
        empComps.forEach((ec: any) => {
          const sc = ec.salary_components;
          if (!sc) return;
          const amt = sc.calculation_type === "percentage" ? proratedBasic * ((sc.percentage || 0) / 100) : (ec.amount || sc.amount || 0);
          if (sc.type === "earning") allowances += amt; else extraDeductions += amt;
        });

        let overtimePay = 0;
        if (p.overtime_enabled && totalOT > 0) overtimePay = Math.round(hourlyRate * totalOT * (p.overtime_multiplier || 1.5));
        let weekendPay = 0;
        if (p.overtime_enabled && weekendHours > 0) weekendPay = Math.round(hourlyRate * weekendHours * (p.weekend_work_multiplier || 1.5));
        let holidayPay = 0;
        if (p.overtime_enabled && holidayHours > 0) holidayPay = Math.round(hourlyRate * holidayHours * (p.holiday_work_multiplier || 2.0));

        const gross = proratedBasic + allowances + overtimePay + weekendPay + holidayPay;

        let absenceDeduction = p.absence_deduction_enabled && absentDays > 0 ? Math.round(dailyRate * absentDays) : 0;
        let unpaidLeaveDeduction = p.unpaid_leave_deduction_enabled && unpaidLeaveDays > 0 ? Math.round(dailyRate * unpaidLeaveDays) : 0;
        let lateDeduction = 0;
        if (p.late_deduction_enabled && (lateMinutes > 0 || lateIncidents > 0)) {
          lateDeduction = p.late_deduction_type === "per_incident"
            ? Math.round(lateIncidents * (p.late_deduction_rate || 0))
            : Math.round(lateMinutes * (p.late_deduction_rate || 0));
        }
        let earlyDeduction = p.early_leave_deduction_enabled && earlyLeaveMinutes > 0 ? Math.round(earlyLeaveMinutes * (p.early_leave_deduction_rate || 0)) : 0;

        const monthlyTax = p.income_tax_enabled ? calculateIraqiIncomeTax(gross * 12) : 0;
        const ssEmployee = Math.round(gross * (p.social_security_employee_pct || 5) / 100);
        const ssEmployer = Math.round(gross * ((policy as any)?.social_security_employer_pct || 12) / 100);

        const empLoans = activeLoans.filter((l: any) => l.employee_id === emp.id);
        const loanDeduction = empLoans.reduce((s: number, l: any) => s + (l.monthly_deduction || 0), 0);

        const totalDed = absenceDeduction + unpaidLeaveDeduction + lateDeduction + earlyDeduction + Math.round(monthlyTax) + ssEmployee + Math.round(extraDeductions) + loanDeduction;
        const net = Math.round(gross) - totalDed;

        totalGross += Math.round(gross);
        totalDeductions += totalDed;
        totalNet += net;

        items.push({
          payroll_run_id: run.id,
          employee_id: emp.id,
          basic_salary: Math.round(proratedBasic),
          allowances: Math.round(allowances),
          gross_salary: Math.round(gross),
          income_tax: Math.round(monthlyTax),
          social_security_employee: ssEmployee,
          social_security_employer: ssEmployer,
          other_deductions: Math.round(extraDeductions) + loanDeduction,
          net_salary: net,
          overtime_pay: overtimePay,
          holiday_weekend_pay: weekendPay + holidayPay,
          absence_deduction: absenceDeduction,
          late_deduction: lateDeduction,
          unpaid_leave_deduction: unpaidLeaveDeduction,
          policy_id: (policy as any)?.id || null,
        });

        summaries.push({
          payroll_run_id: run.id, employee_id: emp.id, company_id: companyId!,
          scheduled_days: workingDays, worked_days: workedDays, absent_days: absentDays,
          paid_leave_days: paidLeaveDays, unpaid_leave_days: unpaidLeaveDays,
          late_minutes: lateMinutes, late_incidents: lateIncidents, early_leave_minutes: earlyLeaveMinutes,
          overtime_hours: totalOT, weekend_worked_hours: weekendHours, holiday_worked_hours: holidayHours,
          daily_rate: Math.round(dailyRate), hourly_rate: Math.round(hourlyRate * 100) / 100,
          absence_deduction: absenceDeduction, unpaid_leave_deduction: unpaidLeaveDeduction,
          late_deduction: lateDeduction, early_leave_deduction: earlyDeduction,
          overtime_pay: overtimePay, weekend_pay: weekendPay, holiday_pay: holidayPay,
        });
      }

      const { error: itemsError } = await supabase.from("payroll_items").insert(items);
      if (itemsError) throw itemsError;

      await supabase.from("payroll_attendance_summary").insert(summaries);

      await supabase.from("payroll_runs").update({
        total_gross: totalGross, total_deductions: totalDeductions, total_net: totalNet, status: "draft",
      }).eq("id", run.id);

      // Update loan remaining amounts
      for (const loan of activeLoans) {
        const newRemaining = (loan.remaining_amount || 0) - (loan.monthly_deduction || 0);
        await supabase.from("loans").update({
          remaining_amount: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? "paid" : "active",
        }).eq("id", loan.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-items"] });
      queryClient.invalidateQueries({ queryKey: ["active-loans-payroll"] });
      toast({ title: "تم بنجاح", description: "تم حساب وتخزين الرواتب" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const createWorkflow = useCreateWorkflowInstance();

  const submitForApproval = useMutation({
    mutationFn: async (runId: string) => {
      await supabase.from("payroll_runs").update({ status: "processing" }).eq("id", runId);
      await createWorkflow.mutateAsync({ requestType: "payroll", referenceId: runId, companyId: companyId! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast({ title: "تم إرسال كشف الرواتب للموافقة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const markAsPaid = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase.from("payroll_runs").update({ status: "paid", locked_at: new Date().toISOString() } as any).eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast({ title: "تم تسجيل الدفع وقفل الكشف" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const activeRun = payrollRuns.find((r: any) => r.id === activeRunId);

  const getWorkflowForRun = (runId: string) => payrollWorkflows.find((w: any) => w.reference_id === runId);
  const activeWorkflow = activeRun ? getWorkflowForRun(activeRun.id) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الرواتب والتعويضات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedBranchId !== "__all__" ? `${filteredEmployees.length} موظف في الفرع المحدد` : `${employees.length} موظف`} • إدارة رواتب الموظفين
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {branches.length > 0 && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-44 font-heading">
                <Building className="h-4 w-4 ml-2 text-muted-foreground" />
                <SelectValue placeholder="كل الفروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">كل الفروع</SelectItem>
                <SelectItem value="__none__">بدون فرع</SelectItem>
                {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button className="gap-2 font-heading" onClick={() => runPayrollDirect.mutate({ month: now.getMonth() + 1, year: now.getFullYear() })} disabled={runPayrollDirect.isPending}>
            <PlayCircle className="h-4 w-4" />{runPayrollDirect.isPending ? "جاري الحساب..." : "تشغيل الرواتب"}
          </Button>
          {activeRun?.status === "draft" && (
            <Button variant="outline" className="gap-2 font-heading" onClick={() => submitForApproval.mutate(activeRun.id)} disabled={submitForApproval.isPending}>
              <Send className="h-4 w-4" />إرسال للموافقة
            </Button>
          )}
          {activeRun?.status === "processing" && activeWorkflow && companyId && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20 font-heading">بانتظار الموافقة</Badge>
              <CurrentApproverBadge
                templateId={activeWorkflow.template_id}
                currentStepOrder={activeWorkflow.current_step_order}
                companyId={companyId}
                status={activeWorkflow.status}
                compact
              />
            </div>
          )}
          {activeRun?.status === "approved" && (
            <Button variant="outline" className="gap-2 font-heading" onClick={() => markAsPaid.mutate(activeRun.id)} disabled={markAsPaid.isPending}>
              <CreditCard className="h-4 w-4" />تسجيل الدفع
            </Button>
          )}
        </div>
      </div>

      <AiModuleInsights
        module="payroll"
        title="رؤى الرواتب الذكية"
        description="تحليل تكاليف الرواتب والاتجاهات"
        feature="workforce_analytics"
        compact
        quickActions={[
          { label: "تحليل التكاليف", question: "حلل تكاليف الرواتب واتجاهاتها. ما هي أبرز التغيرات؟" },
          { label: "مقارنة الأقسام", question: "قارن توزيع الرواتب بين الأقسام المختلفة واشرح الفروقات" },
          { label: "تحليل العمل الإضافي", question: "حلل تكاليف العمل الإضافي وأثرها على إجمالي الرواتب" },
          { label: "توقعات الميزانية", question: "بناءً على الاتجاهات الحالية، ما هي توقعات ميزانية الرواتب للربع القادم؟" },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-muted text-primary"><Wallet className="h-6 w-6" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الرواتب</p>
              <p className="text-xl font-heading font-bold">{(activeRun?.total_gross || 0).toLocaleString("ar-IQ")} د.ع</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-muted text-accent"><Calculator className="h-6 w-6" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الاستقطاعات</p>
              <p className="text-xl font-heading font-bold">{(activeRun?.total_deductions || 0).toLocaleString("ar-IQ")} د.ع</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-muted text-primary"><FileText className="h-6 w-6" /></div>
            <div>
              <p className="text-sm text-muted-foreground">صافي المبلغ</p>
              <p className="text-xl font-heading font-bold">{(activeRun?.total_net || 0).toLocaleString("ar-IQ")} د.ع</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Workflow Timeline — always show when a run exists */}
      {activeRun && companyId && (
        <PayrollWorkflowTimeline
          payrollRunId={activeRun.id}
          currentStatus={activeRun.status}
          companyId={companyId}
        />
      )}

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current" className="font-heading">التفاصيل</TabsTrigger>
          <TabsTrigger value="history" className="font-heading">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {currentPayrollItems.length > 0 ? (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">تفاصيل كشف الرواتب</CardTitle>
                  {activeRun && (
                    <Badge variant="outline" className={`mt-1 ${statusColors[activeRun.status]}`}>
                      {statusLabels[activeRun.status]}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showAllPayslips ? "default" : "outline"}
                    size="sm"
                    className="gap-2 font-heading"
                    onClick={() => { setShowAllPayslips(!showAllPayslips); setInlinePayslipId(null); }}
                  >
                    <Eye className="h-4 w-4" />{showAllPayslips ? "إخفاء الكشوف" : "عرض جميع الكشوف"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportPayrollToExcel(activeRun!, currentPayrollItems)}>
                    <FileSpreadsheet className="h-4 w-4" />Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportPayrollToPDF(activeRun!, currentPayrollItems)}>
                    <Download className="h-4 w-4" />PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportBankTransferFile(activeRun!, currentPayrollItems, employees)}>
                    <CreditCard className="h-4 w-4" />ملف البنك
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                     <TableRow>
                       <TableHead>الموظف</TableHead>
                       <TableHead>القسم</TableHead>
                       <TableHead>الدرجة</TableHead>
                       <TableHead>سنوات الترقية</TableHead>
                       <TableHead>الخدمة الكلية</TableHead>
                       <TableHead>الأساسي</TableHead>
                       <TableHead>إضافي</TableHead>
                       <TableHead>الإجمالي</TableHead>
                       <TableHead>غياب</TableHead>
                       <TableHead>تأخير</TableHead>
                       <TableHead>ضريبة</TableHead>
                       <TableHead>الصافي</TableHead>
                       <TableHead>كشف</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPayrollItems.map((item: any) => {
                       const emp = employees.find((e: any) => e.id === item.employee_id);
                       return (
                       <TableRow key={item.id}>
                         <TableCell className="font-medium">{item.employees?.name_ar}</TableCell>
                         <TableCell className="text-xs text-muted-foreground">{emp?.departments?.name || "—"}</TableCell>
                         <TableCell className="text-xs">{(emp as any)?.positions?.grade_level || "—"}</TableCell>
                         <TableCell className="text-xs">{emp?.promotion_years || 0}</TableCell>
                         <TableCell className="text-xs">{emp?.total_service_years || 0}</TableCell>
                         <TableCell>{item.basic_salary?.toLocaleString("ar-IQ")}</TableCell>
                         <TableCell>{(item.overtime_pay || 0) > 0 ? <span className="text-primary">{item.overtime_pay?.toLocaleString("ar-IQ")}</span> : "—"}</TableCell>
                         <TableCell>{item.gross_salary?.toLocaleString("ar-IQ")}</TableCell>
                         <TableCell>{(item.absence_deduction || 0) > 0 ? <span className="text-destructive">{item.absence_deduction?.toLocaleString("ar-IQ")}</span> : "—"}</TableCell>
                         <TableCell>{(item.late_deduction || 0) > 0 ? <span className="text-destructive">{item.late_deduction?.toLocaleString("ar-IQ")}</span> : "—"}</TableCell>
                         <TableCell>{item.income_tax?.toLocaleString("ar-IQ")}</TableCell>
                         <TableCell className="font-bold text-primary">{item.net_salary?.toLocaleString("ar-IQ")}</TableCell>
                         <TableCell>
                           <Button size="sm" variant={inlinePayslipId === item.id ? "default" : "ghost"} className="h-7 px-2 gap-1 font-heading text-primary" onClick={() => setInlinePayslipId(inlinePayslipId === item.id ? null : item.id)}>
                             <Receipt className="h-4 w-4" />كشف
                           </Button>
                         </TableCell>
                       </TableRow>
                     );})}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Show all payslips */}
              {showAllPayslips && (
                <div className="p-4 border-t border-border space-y-4">
                  {currentPayrollItems.map((item: any) => (
                    <InlinePayslip
                      key={item.id}
                      item={item}
                      run={activeRun}
                      employee={employees.find((e: any) => e.id === item.employee_id)}
                      allItems={currentPayrollItems}
                      onClose={() => setShowAllPayslips(false)}
                    />
                  ))}
                </div>
              )}

              {/* Single inline payslip panel */}
              {!showAllPayslips && inlinePayslipId && (() => {
                const selectedItem = currentPayrollItems.find((i: any) => i.id === inlinePayslipId);
                if (!selectedItem) return null;
                return (
                  <div className="p-4 border-t border-border">
                    <InlinePayslip
                      item={selectedItem}
                      run={activeRun}
                      employee={employees.find((e: any) => e.id === selectedItem.employee_id)}
                      allItems={currentPayrollItems}
                      onClose={() => setInlinePayslipId(null)}
                    />
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لم يتم تشغيل الرواتب بعد</p>
              <p className="text-sm mt-1">استخدم تبويب المحاكاة لمعاينة وتشغيل الرواتب</p>
            </CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="history">
          {(() => {
            const filteredRuns = selectedBranchId === "__all__"
              ? payrollRuns
              : selectedBranchId === "__none__"
                ? payrollRuns.filter((r: any) => !r.branch_id)
                : payrollRuns.filter((r: any) => r.branch_id === selectedBranchId);
            return filteredRuns.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>الشهر</TableHead>
                     <TableHead>السنة</TableHead>
                     <TableHead>الفرع</TableHead>
                     <TableHead>الإجمالي</TableHead>
                     <TableHead>الصافي</TableHead>
                     <TableHead>الحالة</TableHead>
                     <TableHead>المعتمد الحالي</TableHead>
                     <TableHead>إجراء</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((run: any) => {
                    const wf = getWorkflowForRun(run.id);
                    return (
                    <TableRow key={run.id} className={run.id === activeRunId ? "bg-muted/50" : ""}>
                     <TableCell>{run.month}</TableCell>
                     <TableCell>{run.year}</TableCell>
                     <TableCell>{run.branches?.name || <span className="text-muted-foreground">الكل</span>}</TableCell>
                     <TableCell>{run.total_gross?.toLocaleString("ar-IQ")} د.ع</TableCell>
                     <TableCell>{run.total_net?.toLocaleString("ar-IQ")} د.ع</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[run.status]}>{statusLabels[run.status]}</Badge></TableCell>
                      <TableCell>
                        {wf && companyId && (
                          <CurrentApproverBadge
                            templateId={wf.template_id}
                            currentStepOrder={wf.current_step_order}
                            companyId={companyId}
                            status={wf.status}
                            compact
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 font-heading" onClick={() => setSelectedRunId(run.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {run.status === "draft" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-accent-foreground" onClick={() => submitForApproval.mutate(run.id)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {run.status === "approved" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={() => markAsPaid.mutate(run.id)}>
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد سجل رواتب سابق {selectedBranchId !== "__all__" ? "لهذا الفرع" : ""}</CardContent></Card>
          );
          })()}
        </TabsContent>
      </Tabs>

      <PayslipDialog
        open={payslipOpen}
        onOpenChange={setPayslipOpen}
        item={payslipItem}
        run={activeRun}
        employee={employees.find((e: any) => e.id === payslipItem?.employee_id)}
      />
    </div>
  );
}
