import { useState, useMemo } from "react";
import {
  BarChart3, Users, TrendingUp, TrendingDown, Clock, Wallet, CalendarDays,
  FileSpreadsheet, Filter, Building2, UserCheck, AlertTriangle, Award,
  Briefcase, Shield, Activity, Target, GraduationCap, HeartPulse, Scale,
  UserMinus, UserPlus, Timer, MapPin, Percent, ArrowUpDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, LineChart, Line, ResponsiveContainer, Legend } from "recharts";
import * as XLSX from "xlsx";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent))"];

function KpiCard({ icon: Icon, value, label, color = "text-primary", sub }: { icon: any; value: string | number; label: string; color?: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
        <p className={`text-xl font-heading font-bold ${color}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text = "لا توجد بيانات" }: { text?: string }) {
  return <p className="text-sm text-center text-muted-foreground py-8">{text}</p>;
}

const chartConfig = {
  count: { label: "العدد", color: "hsl(var(--primary))" },
  hires: { label: "التعيينات", color: "hsl(var(--primary))" },
  terminations: { label: "إنهاءات", color: "hsl(var(--destructive))" },
  gross: { label: "إجمالي", color: "hsl(var(--primary))" },
  net: { label: "صافي", color: "hsl(var(--chart-2))" },
  deductions: { label: "استقطاعات", color: "hsl(var(--destructive))" },
  value: { label: "القيمة", color: "hsl(var(--primary))" },
  hours: { label: "ساعات", color: "hsl(var(--primary))" },
  violations: { label: "مخالفات", color: "hsl(var(--destructive))" },
  overtime: { label: "إضافي", color: "hsl(var(--chart-3))" },
  approved: { label: "مقبول", color: "hsl(var(--primary))" },
  pending: { label: "معلق", color: "hsl(var(--chart-4))" },
  rejected: { label: "مرفوض", color: "hsl(var(--destructive))" },
  salary: { label: "الراتب", color: "hsl(var(--primary))" },
  rate: { label: "النسبة", color: "hsl(var(--chart-2))" },
};

export default function Reports() {
  const { companyId } = useCompany();
  const [deptFilter, setDeptFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  // ─── Data Queries ───────────────────────────────────
  const { data: employees = [], isLoading: l1 } = useQuery({
    queryKey: ["rpt-employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name, id), branches:departments(branch_id)").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["rpt-departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, branch_id, level, parent_department_id").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["rpt-branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, city, is_headquarters").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: leaveRequests = [], isLoading: l2 } = useQuery({
    queryKey: ["rpt-leave", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*, employees(name_ar, department_id), leave_types(name)").eq("company_id", companyId!).gte("start_date", dateFrom).lte("start_date", dateTo);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["rpt-attendance", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_records").select("date, hours_worked, overtime_hours, employee_id, check_in, check_out").eq("company_id", companyId!).gte("date", dateFrom).lte("date", dateTo);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["rpt-violations", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_violations").select("date, violation_type, minutes_diff, employee_id, status").eq("company_id", companyId!).gte("date", dateFrom).lte("date", dateTo);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ["rpt-payroll", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_runs").select("*").eq("company_id", companyId!).order("year").order("month");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: payrollItems = [] } = useQuery({
    queryKey: ["rpt-payroll-items", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_items").select("employee_id, gross_salary, net_salary, total_deductions, total_allowances, payroll_run_id");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["rpt-contracts", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("employee_id, contract_type, start_date, end_date, status, salary").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: training = [] } = useQuery({
    queryKey: ["rpt-training", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("training_courses").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["rpt-goals", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("status, progress, employee_id").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: appraisals = [] } = useQuery({
    queryKey: ["rpt-appraisals", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("appraisals").select("employee_id, overall_rating, status, cycle").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["rpt-penalties", companyId, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from("employee_penalties").select("employee_id, penalty_type, amount, date").eq("company_id", companyId!).gte("date", dateFrom).lte("date", dateTo);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: recruitmentJobs = [] } = useQuery({
    queryKey: ["rpt-jobs", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("recruitment_jobs").select("id, title, status, positions_count, created_at, department_id").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["rpt-candidates", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("id, stage, source, rating, job_id, created_at").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["rpt-loans", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("employee_id, amount, remaining_amount, status, loan_type").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: exitSurveys = [] } = useQuery({
    queryKey: ["rpt-exit", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("exit_surveys").select("employee_id, overall_rating, primary_reason, created_at").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  // ─── Build Employee-to-Dept/Branch lookup ───────────
  const empDeptMap = useMemo(() => {
    const m: Record<string, string> = {};
    employees.forEach((e: any) => { m[e.id] = e.department_id; });
    return m;
  }, [employees]);

  const deptBranchMap = useMemo(() => {
    const m: Record<string, string> = {};
    departments.forEach((d: any) => { if (d.branch_id) m[d.id] = d.branch_id; });
    return m;
  }, [departments]);

  const getEmpBranch = (empId: string) => deptBranchMap[empDeptMap[empId] || ""] || "";

  // ─── Filters ─────────────────────────────────────────
  const filteredEmployees = useMemo(() => employees.filter((e: any) => {
    if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
    if (branchFilter !== "all" && deptBranchMap[e.department_id] !== branchFilter) return false;
    return true;
  }), [employees, deptFilter, branchFilter, deptBranchMap]);

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map((e: any) => e.id)), [filteredEmployees]);

  const filterByEmp = <T extends any>(arr: T[]) =>
    deptFilter === "all" && branchFilter === "all" ? arr : arr.filter((r: any) => filteredEmpIds.has(r.employee_id));

  // ─── Computed KPIs ───────────────────────────────────
  const activeEmps = filteredEmployees.filter((e: any) => e.status === "active");
  const terminatedEmps = filteredEmployees.filter((e: any) => e.status === "terminated");
  const totalSalary = activeEmps.reduce((s: number, e: any) => s + (e.basic_salary || 0), 0);
  const avgSalary = activeEmps.length > 0 ? Math.round(totalSalary / activeEmps.length) : 0;
  const medianSalary = (() => {
    const sorted = activeEmps.map((e: any) => e.basic_salary || 0).sort((a: number, b: number) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  })();

  const filteredAttendance = filterByEmp(attendance);
  const filteredViolations = filterByEmp(violations);
  const filteredLeave = filterByEmp(leaveRequests);
  const filteredPenalties = filterByEmp(penalties);

  const totalHoursWorked = filteredAttendance.reduce((s: number, a: any) => s + (a.hours_worked || 0), 0);
  const totalOvertime = filteredAttendance.reduce((s: number, a: any) => s + (a.overtime_hours || 0), 0);
  const avgHoursPerDay = filteredAttendance.length > 0 ? (totalHoursWorked / filteredAttendance.length).toFixed(1) : "0";

  // Turnover rate
  const hiredInPeriod = filteredEmployees.filter((e: any) => e.hire_date >= dateFrom && e.hire_date <= dateTo).length;
  const terminatedInPeriod = filteredEmployees.filter((e: any) => e.termination_date && e.termination_date >= dateFrom && e.termination_date <= dateTo).length;
  const turnoverRate = activeEmps.length > 0 ? ((terminatedInPeriod / activeEmps.length) * 100).toFixed(1) : "0";

  // Tenure distribution
  const tenureData = useMemo(() => {
    const buckets = [
      { label: "< 1 سنة", min: 0, max: 365 },
      { label: "1-3 سنوات", min: 365, max: 1095 },
      { label: "3-5 سنوات", min: 1095, max: 1825 },
      { label: "5-10 سنوات", min: 1825, max: 3650 },
      { label: "10+ سنوات", min: 3650, max: Infinity },
    ];
    const now = Date.now();
    return buckets.map(b => ({
      label: b.label,
      count: activeEmps.filter((e: any) => {
        if (!e.hire_date) return false;
        const days = (now - new Date(e.hire_date).getTime()) / 86400000;
        return days >= b.min && days < b.max;
      }).length,
    }));
  }, [activeEmps]);

  // Avg tenure in years
  const avgTenure = useMemo(() => {
    const now = Date.now();
    const tenures = activeEmps.filter((e: any) => e.hire_date).map((e: any) => (now - new Date(e.hire_date).getTime()) / (365.25 * 86400000));
    return tenures.length > 0 ? (tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1) : "0";
  }, [activeEmps]);

  // Dept breakdown
  const deptBreakdown = useMemo(() => {
    const acc: Record<string, { name: string; active: number; total: number; salary: number; avgSalary: number }> = {};
    filteredEmployees.forEach((e: any) => {
      const dName = e.departments?.name || "بدون قسم";
      if (!acc[dName]) acc[dName] = { name: dName, active: 0, total: 0, salary: 0, avgSalary: 0 };
      acc[dName].total++;
      if (e.status === "active") { acc[dName].active++; acc[dName].salary += e.basic_salary || 0; }
    });
    Object.values(acc).forEach(d => { d.avgSalary = d.active > 0 ? Math.round(d.salary / d.active) : 0; });
    return Object.values(acc).sort((a, b) => b.total - a.total);
  }, [filteredEmployees]);

  // Branch breakdown
  const branchBreakdown = useMemo(() => {
    const acc: Record<string, { name: string; employees: number; departments: number; salary: number }> = {};
    branches.forEach((b: any) => { acc[b.id] = { name: b.name, employees: 0, departments: 0, salary: 0 }; });
    departments.forEach((d: any) => { if (d.branch_id && acc[d.branch_id]) acc[d.branch_id].departments++; });
    employees.forEach((e: any) => {
      const branchId = deptBranchMap[e.department_id];
      if (branchId && acc[branchId]) { acc[branchId].employees++; if (e.status === "active") acc[branchId].salary += e.basic_salary || 0; }
    });
    return Object.values(acc);
  }, [branches, departments, employees, deptBranchMap]);

  // Gender & contract type
  const genderData = [
    { name: "ذكور", value: filteredEmployees.filter((e: any) => e.gender === "male").length, fill: COLORS[0] },
    { name: "إناث", value: filteredEmployees.filter((e: any) => e.gender === "female").length, fill: COLORS[1] },
    { name: "غير محدد", value: filteredEmployees.filter((e: any) => !e.gender).length, fill: COLORS[5] },
  ].filter(d => d.value > 0);

  const contractTypeData = [
    { name: "دائم", value: filteredEmployees.filter((e: any) => e.contract_type === "permanent").length, fill: COLORS[0] },
    { name: "مؤقت", value: filteredEmployees.filter((e: any) => e.contract_type === "temporary").length, fill: COLORS[1] },
    { name: "دوام جزئي", value: filteredEmployees.filter((e: any) => e.contract_type === "part_time").length, fill: COLORS[2] },
  ].filter(d => d.value > 0);

  // Salary ranges
  const salaryRanges = [
    { range: "0-500K", min: 0, max: 500000 },
    { range: "500K-1M", min: 500000, max: 1000000 },
    { range: "1M-2M", min: 1000000, max: 2000000 },
    { range: "2M-3M", min: 2000000, max: 3000000 },
    { range: "3M+", min: 3000000, max: Infinity },
  ];
  const salaryDistData = salaryRanges.map(r => ({
    range: r.range,
    count: activeEmps.filter((e: any) => (e.basic_salary || 0) >= r.min && (e.basic_salary || 0) < r.max).length,
  }));

  // Hiring & termination trend (monthly)
  const hiringTermTrend = useMemo(() => {
    const months: { month: string; hires: number; terminations: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: MONTHS_AR[d.getMonth()],
        hires: employees.filter((e: any) => e.hire_date?.startsWith(key)).length,
        terminations: employees.filter((e: any) => e.termination_date?.startsWith(key)).length,
      });
    }
    return months;
  }, [employees]);

  // Attendance monthly trend
  const attendanceMonthly = useMemo(() => {
    const acc: Record<string, { month: string; hours: number; overtime: number; violations: number; records: number }> = {};
    filteredAttendance.forEach((a: any) => {
      const m = a.date?.substring(0, 7);
      if (!m) return;
      if (!acc[m]) acc[m] = { month: m, hours: 0, overtime: 0, violations: 0, records: 0 };
      acc[m].hours += a.hours_worked || 0;
      acc[m].overtime += a.overtime_hours || 0;
      acc[m].records++;
    });
    filteredViolations.forEach((v: any) => {
      const m = v.date?.substring(0, 7);
      if (m && acc[m]) acc[m].violations++;
    });
    return Object.values(acc).sort((a, b) => a.month.localeCompare(b.month)).map(d => ({
      ...d, month: MONTHS_AR[parseInt(d.month.split("-")[1]) - 1] || d.month,
      avgHours: d.records > 0 ? +(d.hours / d.records).toFixed(1) : 0,
    }));
  }, [filteredAttendance, filteredViolations]);

  // Violation types breakdown
  const violationTypes = useMemo(() => {
    const acc: Record<string, number> = {};
    const typeLabels: Record<string, string> = { late_arrival: "تأخير", early_departure: "انصراف مبكر", absent: "غياب", missed_checkout: "نسيان تسجيل خروج" };
    filteredViolations.forEach((v: any) => {
      const label = typeLabels[v.violation_type] || v.violation_type;
      acc[label] = (acc[label] || 0) + 1;
    });
    return Object.entries(acc).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [filteredViolations]);

  // Top violators
  const topViolators = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredViolations.forEach((v: any) => { acc[v.employee_id] = (acc[v.employee_id] || 0) + 1; });
    return Object.entries(acc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([empId, count]) => {
        const emp = employees.find((e: any) => e.id === empId);
        return { name: emp?.name_ar || "—", count };
      });
  }, [filteredViolations, employees]);

  // Payroll trend
  const payrollTrend = payrollRuns.slice(-12).map((r: any) => ({
    month: MONTHS_AR[(r.month || 1) - 1],
    gross: Number(r.total_gross || 0),
    net: Number(r.total_net || 0),
    deductions: Number(r.total_deductions || 0),
  }));

  // Leave KPIs
  const leaveApproved = filteredLeave.filter((l: any) => l.status === "approved").length;
  const leavePending = filteredLeave.filter((l: any) => l.status === "pending").length;
  const leaveRejected = filteredLeave.filter((l: any) => l.status === "rejected").length;
  const leaveByType = filteredLeave.reduce<Record<string, number>>((acc, l: any) => {
    const t = l.leave_types?.name || "أخرى";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const leaveTypeData = Object.entries(leaveByType).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));

  // Leave by department
  const leaveByDept = useMemo(() => {
    const acc: Record<string, { name: string; total: number; approved: number }> = {};
    filteredLeave.forEach((l: any) => {
      const deptId = l.employees?.department_id;
      const dept = departments.find((d: any) => d.id === deptId);
      const dName = dept?.name || "غير محدد";
      if (!acc[dName]) acc[dName] = { name: dName, total: 0, approved: 0 };
      acc[dName].total++;
      if (l.status === "approved") acc[dName].approved++;
    });
    return Object.values(acc).sort((a, b) => b.total - a.total);
  }, [filteredLeave, departments]);

  // Recruitment KPIs
  const openJobs = recruitmentJobs.filter((j: any) => j.status === "open" || j.status === "active").length;
  const totalPositionsOpen = recruitmentJobs.filter((j: any) => j.status === "open" || j.status === "active").reduce((s: number, j: any) => s + (j.positions_count || 1), 0);
  const totalCandidates = candidates.length;
  const hiredCandidates = candidates.filter((c: any) => c.stage === "hired").length;
  const rejectedCandidates = candidates.filter((c: any) => c.stage === "rejected").length;
  const conversionRate = totalCandidates > 0 ? ((hiredCandidates / totalCandidates) * 100).toFixed(1) : "0";

  const candidatesByStage = useMemo(() => {
    const stageLabels: Record<string, string> = { applied: "تقدم", screening: "فرز", interview: "مقابلة", offer: "عرض", hired: "معيّن", rejected: "مرفوض" };
    const acc: Record<string, number> = {};
    candidates.forEach((c: any) => {
      const label = stageLabels[c.stage] || c.stage;
      acc[label] = (acc[label] || 0) + 1;
    });
    return Object.entries(acc).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [candidates]);

  const candidatesBySource = useMemo(() => {
    const acc: Record<string, number> = {};
    candidates.forEach((c: any) => { acc[c.source || "غير محدد"] = (acc[c.source || "غير محدد"] || 0) + 1; });
    return Object.entries(acc).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [candidates]);

  // Performance KPIs
  const goalsInProgress = goals.filter((g: any) => g.status === "in_progress").length;
  const goalsCompleted = goals.filter((g: any) => g.status === "completed").length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s: number, g: any) => s + (g.progress || 0), 0) / goals.length) : 0;
  const avgRating = appraisals.length > 0 ? (appraisals.reduce((s: number, a: any) => s + (a.overall_rating || 0), 0) / appraisals.length).toFixed(1) : "—";

  // Loans KPIs
  const activeLoans = loans.filter((l: any) => l.status === "active");
  const totalLoanAmount = activeLoans.reduce((s: number, l: any) => s + (l.amount || 0), 0);
  const totalLoanRemaining = activeLoans.reduce((s: number, l: any) => s + (l.remaining_amount || 0), 0);

  // Contracts expiring in next 90 days
  const expiringContracts = contracts.filter((c: any) => {
    if (!c.end_date || c.status !== "active") return false;
    const days = (new Date(c.end_date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 90;
  }).length;

  // Exit survey avg rating
  const exitAvgRating = exitSurveys.length > 0
    ? (exitSurveys.reduce((s: number, e: any) => s + (e.overall_rating || 0), 0) / exitSurveys.length).toFixed(1)
    : "—";

  // ─── Export ──────────────────────────────────────────
  const exportReport = (type: string) => {
    let data: any[] = [];
    let fileName = "";
    if (type === "employees") {
      data = filteredEmployees.map((e: any) => ({
        "الاسم": e.name_ar, "القسم": e.departments?.name || "—", "المسمى": e.position || "—",
        "الحالة": e.status === "active" ? "نشط" : e.status === "on_leave" ? "إجازة" : "منتهي",
        "الراتب": e.basic_salary || 0, "تاريخ التعيين": e.hire_date || "—", "الجنس": e.gender === "male" ? "ذكر" : e.gender === "female" ? "أنثى" : "—",
      }));
      fileName = "تقرير_الموظفين";
    } else if (type === "attendance") {
      data = filteredAttendance.map((a: any) => {
        const emp = employees.find((e: any) => e.id === a.employee_id);
        return { "الموظف": emp?.name_ar || "—", "التاريخ": a.date, "حضور": a.check_in || "—", "انصراف": a.check_out || "—", "ساعات": a.hours_worked || 0, "إضافي": a.overtime_hours || 0 };
      });
      fileName = "تقرير_الحضور";
    } else if (type === "leave") {
      data = filteredLeave.map((l: any) => ({
        "الموظف": l.employees?.name_ar || "—", "النوع": l.leave_types?.name || "—",
        "من": l.start_date, "إلى": l.end_date,
        "الحالة": l.status === "approved" ? "مقبول" : l.status === "pending" ? "معلق" : "مرفوض",
      }));
      fileName = "تقرير_الإجازات";
    } else if (type === "payroll") {
      data = payrollRuns.map((r: any) => ({
        "الشهر": r.month, "السنة": r.year, "الإجمالي": r.total_gross || 0,
        "الاستقطاعات": r.total_deductions || 0, "الصافي": r.total_net || 0, "الحالة": r.status,
      }));
      fileName = "تقرير_الرواتب";
    } else if (type === "violations") {
      data = filteredViolations.map((v: any) => {
        const emp = employees.find((e: any) => e.id === v.employee_id);
        return { "الموظف": emp?.name_ar || "—", "التاريخ": v.date, "النوع": v.violation_type, "الدقائق": v.minutes_diff || 0, "الحالة": v.status };
      });
      fileName = "تقرير_المخالفات";
    } else if (type === "recruitment") {
      data = candidates.map((c: any) => {
        const job = recruitmentJobs.find((j: any) => j.id === c.job_id);
        return { "الوظيفة": job?.title || "—", "المرحلة": c.stage, "المصدر": c.source || "—", "التقييم": c.rating || "—" };
      });
      fileName = "تقرير_التوظيف";
    } else if (type === "branches") {
      data = branchBreakdown.map(b => ({
        "الفرع": b.name, "الموظفون": b.employees, "الأقسام": b.departments, "إجمالي الرواتب": b.salary,
      }));
      fileName = "تقرير_الفروع";
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير");
    XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString("ar-IQ")}.xlsx`);
  };

  if (l1 || l2) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">التقارير والتحليلات</h1>
        <p className="text-muted-foreground text-sm mt-1">تقارير شاملة لجميع مؤشرات الأداء</p>
      </div>

      {/* Global Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">من تاريخ</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-40 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">إلى تاريخ</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-40 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">الفرع</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفروع</SelectItem>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">القسم</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard icon={Users} value={activeEmps.length} label="موظف نشط" />
        <KpiCard icon={UserPlus} value={hiredInPeriod} label="تعيينات الفترة" color="text-chart-2" />
        <KpiCard icon={UserMinus} value={terminatedInPeriod} label="إنهاءات الفترة" color="text-destructive" />
        <KpiCard icon={Percent} value={`${turnoverRate}%`} label="معدل الدوران" color="text-destructive" />
        <KpiCard icon={Wallet} value={avgSalary.toLocaleString("ar-IQ")} label="متوسط الراتب" sub="د.ع" />
        <KpiCard icon={Clock} value={avgHoursPerDay} label="متوسط ساعات/يوم" />
        <KpiCard icon={AlertTriangle} value={filteredViolations.length} label="مخالفات الفترة" color="text-destructive" />
        <KpiCard icon={CalendarDays} value={leaveApproved} label="إجازات مقبولة" color="text-chart-2" />
      </div>

      <Tabs defaultValue="workforce">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="workforce" className="font-heading text-xs">القوى العاملة</TabsTrigger>
          <TabsTrigger value="attendance" className="font-heading text-xs">الحضور والانضباط</TabsTrigger>
          <TabsTrigger value="payroll" className="font-heading text-xs">الرواتب</TabsTrigger>
          <TabsTrigger value="leave" className="font-heading text-xs">الإجازات</TabsTrigger>
          <TabsTrigger value="recruitment" className="font-heading text-xs">التوظيف</TabsTrigger>
          <TabsTrigger value="performance" className="font-heading text-xs">الأداء</TabsTrigger>
          <TabsTrigger value="branches" className="font-heading text-xs">الفروع</TabsTrigger>
          <TabsTrigger value="financial" className="font-heading text-xs">مالي</TabsTrigger>
        </TabsList>

        {/* ════════════════ WORKFORCE ════════════════ */}
        <TabsContent value="workforce" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("employees")}>
              <FileSpreadsheet className="h-4 w-4" />تصدير
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard icon={Users} value={filteredEmployees.length} label="إجمالي الموظفين" />
            <KpiCard icon={Scale} value={medianSalary.toLocaleString("ar-IQ")} label="الوسيط" sub="د.ع" />
            <KpiCard icon={Timer} value={avgTenure} label="متوسط الخدمة (سنوات)" />
            <KpiCard icon={Shield} value={expiringContracts} label="عقود تنتهي قريباً" color="text-destructive" sub="خلال 90 يوم" />
            <KpiCard icon={HeartPulse} value={exitAvgRating} label="تقييم استطلاع الخروج" sub="من 5" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hiring vs Termination */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">التعيينات مقابل الإنهاءات (12 شهر)</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart data={hiringTermTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hires" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="terminations" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Tenure */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">توزيع سنوات الخدمة</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart data={tenureData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Gender */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">توزيع الجنس</CardTitle></CardHeader>
              <CardContent>
                {genderData.length > 0 ? (
                  <>
                    <ChartContainer config={chartConfig} className="h-[180px] w-full mx-auto aspect-square">
                      <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                          {genderData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex justify-center gap-4 mt-1">{genderData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} /><span className="text-muted-foreground">{d.name} ({d.value})</span></div>
                    ))}</div>
                  </>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            {/* Contract Type */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">أنواع العقود</CardTitle></CardHeader>
              <CardContent>
                {contractTypeData.length > 0 ? (
                  <>
                    <ChartContainer config={chartConfig} className="h-[180px] w-full mx-auto aspect-square">
                      <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={contractTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                          {contractTypeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex justify-center gap-4 mt-1">{contractTypeData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} /><span className="text-muted-foreground">{d.name} ({d.value})</span></div>
                    ))}</div>
                  </>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            {/* Salary Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">توزيع الرواتب</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart data={salaryDistData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Department Table */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="font-heading text-sm">تفاصيل الأقسام</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>القسم</TableHead><TableHead>الإجمالي</TableHead><TableHead>نشط</TableHead><TableHead>إجمالي الرواتب</TableHead><TableHead>متوسط الراتب</TableHead><TableHead>النسبة</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {deptBreakdown.map((d: any) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.total}</TableCell>
                      <TableCell>{d.active}</TableCell>
                      <TableCell>{d.salary.toLocaleString("ar-IQ")} د.ع</TableCell>
                      <TableCell>{d.avgSalary.toLocaleString("ar-IQ")} د.ع</TableCell>
                      <TableCell><Badge variant="outline">{filteredEmployees.length > 0 ? Math.round((d.total / filteredEmployees.length) * 100) : 0}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ ATTENDANCE ════════════════ */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("attendance")}><FileSpreadsheet className="h-4 w-4" />تصدير الحضور</Button>
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("violations")}><FileSpreadsheet className="h-4 w-4" />تصدير المخالفات</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard icon={Activity} value={filteredAttendance.length} label="سجلات الحضور" />
            <KpiCard icon={Clock} value={totalHoursWorked.toFixed(0)} label="إجمالي الساعات" />
            <KpiCard icon={Timer} value={totalOvertime.toFixed(0)} label="ساعات إضافية" color="text-chart-3" />
            <KpiCard icon={AlertTriangle} value={filteredViolations.length} label="مخالفات" color="text-destructive" />
            <KpiCard icon={Percent} value={filteredAttendance.length > 0 ? `${((filteredAttendance.length - filteredViolations.length) / filteredAttendance.length * 100).toFixed(1)}%` : "0%"} label="معدل الالتزام" color="text-chart-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Trend */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">اتجاه الحضور الشهري</CardTitle></CardHeader>
              <CardContent>
                {attendanceMonthly.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart data={attendanceMonthly}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="ساعات" />
                      <Area type="monotone" dataKey="overtime" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.1)" strokeWidth={2} name="إضافي" />
                      <Area type="monotone" dataKey="violations" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={2} name="مخالفات" />
                    </AreaChart>
                  </ChartContainer>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            {/* Violation Types */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">أنواع المخالفات</CardTitle></CardHeader>
              <CardContent>
                {violationTypes.length > 0 ? (
                  <>
                    <ChartContainer config={chartConfig} className="h-[200px] w-full mx-auto aspect-square">
                      <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={violationTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={3}>
                          {violationTypes.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex justify-center gap-3 flex-wrap mt-1">{violationTypes.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} /><span className="text-muted-foreground">{d.name} ({d.value})</span></div>
                    ))}</div>
                  </>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            {/* Top Violators */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">أكثر الموظفين مخالفات</CardTitle></CardHeader>
              <CardContent>
                {topViolators.length > 0 ? (
                  <div className="space-y-2">
                    {topViolators.map((v, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{i + 1}. {v.name}</span>
                        <Badge variant={v.count > 10 ? "destructive" : "outline"}>{v.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ PAYROLL ════════════════ */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("payroll")}><FileSpreadsheet className="h-4 w-4" />تصدير</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={Wallet} value={totalSalary.toLocaleString("ar-IQ")} label="إجمالي الرواتب الشهرية" sub="د.ع" />
            <KpiCard icon={Wallet} value={avgSalary.toLocaleString("ar-IQ")} label="متوسط الراتب" sub="د.ع" />
            <KpiCard icon={Wallet} value={medianSalary.toLocaleString("ar-IQ")} label="الوسيط" sub="د.ع" />
            <KpiCard icon={TrendingUp} value={payrollRuns.length} label="دورات رواتب" />
          </div>

          {payrollTrend.length > 0 ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">اتجاه الرواتب الشهرية</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <AreaChart data={payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="gross" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                    <Area type="monotone" dataKey="net" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="deductions" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">لا توجد بيانات رواتب</CardContent></Card>}

          {payrollRuns.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="font-heading text-sm">سجل دورات الرواتب</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>الشهر</TableHead><TableHead>السنة</TableHead><TableHead>الإجمالي</TableHead><TableHead>الاستقطاعات</TableHead><TableHead>الصافي</TableHead><TableHead>الحالة</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {payrollRuns.map((run: any) => (
                      <TableRow key={run.id}>
                        <TableCell>{MONTHS_AR[(run.month || 1) - 1]}</TableCell>
                        <TableCell>{run.year}</TableCell>
                        <TableCell>{(run.total_gross || 0).toLocaleString("ar-IQ")} د.ع</TableCell>
                        <TableCell>{(run.total_deductions || 0).toLocaleString("ar-IQ")} د.ع</TableCell>
                        <TableCell className="font-bold text-primary">{(run.total_net || 0).toLocaleString("ar-IQ")} د.ع</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={run.status === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                            {run.status === "paid" ? "مدفوع" : run.status === "approved" ? "معتمد" : run.status === "processing" ? "قيد المعالجة" : "مسودة"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════ LEAVE ════════════════ */}
        <TabsContent value="leave" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("leave")}><FileSpreadsheet className="h-4 w-4" />تصدير</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={CalendarDays} value={filteredLeave.length} label="إجمالي الطلبات" />
            <KpiCard icon={UserCheck} value={leaveApproved} label="مقبولة" color="text-chart-2" />
            <KpiCard icon={Clock} value={leavePending} label="معلقة" color="text-chart-4" />
            <KpiCard icon={UserMinus} value={leaveRejected} label="مرفوضة" color="text-destructive" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Leave by Type */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">الإجازات حسب النوع</CardTitle></CardHeader>
              <CardContent>
                {leaveTypeData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={leaveTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {leaveTypeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            {/* Leave by Department */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">الإجازات حسب القسم</CardTitle></CardHeader>
              <CardContent>
                {leaveByDept.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={leaveByDept} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} name="إجمالي" />
                      <Bar dataKey="approved" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="مقبول" />
                    </BarChart>
                  </ChartContainer>
                ) : <EmptyState />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ RECRUITMENT ════════════════ */}
        <TabsContent value="recruitment" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("recruitment")}><FileSpreadsheet className="h-4 w-4" />تصدير</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard icon={Briefcase} value={openJobs} label="وظائف مفتوحة" />
            <KpiCard icon={Target} value={totalPositionsOpen} label="مقاعد مطلوبة" />
            <KpiCard icon={Users} value={totalCandidates} label="إجمالي المرشحين" />
            <KpiCard icon={UserCheck} value={hiredCandidates} label="تم تعيينهم" color="text-chart-2" />
            <KpiCard icon={Percent} value={`${conversionRate}%`} label="معدل التحويل" color="text-primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">المرشحون حسب المرحلة</CardTitle></CardHeader>
              <CardContent>
                {candidatesByStage.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart data={candidatesByStage}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {candidatesByStage.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">مصادر التوظيف</CardTitle></CardHeader>
              <CardContent>
                {candidatesBySource.length > 0 ? (
                  <>
                    <ChartContainer config={chartConfig} className="h-[180px] w-full mx-auto aspect-square">
                      <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={candidatesBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={3}>
                          {candidatesBySource.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex justify-center gap-3 flex-wrap mt-1">{candidatesBySource.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} /><span className="text-muted-foreground">{d.name} ({d.value})</span></div>
                    ))}</div>
                  </>
                ) : <EmptyState />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ PERFORMANCE ════════════════ */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard icon={Target} value={goals.length} label="إجمالي الأهداف" />
            <KpiCard icon={Activity} value={goalsInProgress} label="قيد التنفيذ" color="text-chart-4" />
            <KpiCard icon={Award} value={goalsCompleted} label="مكتملة" color="text-chart-2" />
            <KpiCard icon={Percent} value={`${avgProgress}%`} label="متوسط التقدم" />
            <KpiCard icon={Award} value={avgRating} label="متوسط تقييم الأداء" sub="من 5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">الدورات التدريبية</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي الدورات</span><span className="font-heading font-bold">{training.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">نشطة / مخططة</span><span className="font-heading font-bold text-primary">{training.filter((t: any) => t.status === "active" || t.status === "planned").length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">مكتملة</span><span className="font-heading font-bold">{training.filter((t: any) => t.status === "completed").length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">إلزامية</span><span className="font-heading font-bold text-destructive">{training.filter((t: any) => t.is_mandatory).length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي التكاليف</span><span className="font-heading font-bold">{training.reduce((s: number, t: any) => s + (t.cost || 0), 0).toLocaleString("ar-IQ")} د.ع</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">الجزاءات والمخالفات</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">عدد الجزاءات</span><span className="font-heading font-bold text-destructive">{filteredPenalties.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي المبالغ</span><span className="font-heading font-bold">{filteredPenalties.reduce((s: number, p: any) => s + (p.amount || 0), 0).toLocaleString("ar-IQ")} د.ع</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">تقييمات الأداء</span><span className="font-heading font-bold">{appraisals.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">مكتملة</span><span className="font-heading font-bold text-primary">{appraisals.filter((a: any) => a.status === "completed" || a.status === "submitted").length}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ════════════════ BRANCHES ════════════════ */}
        <TabsContent value="branches" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportReport("branches")}><FileSpreadsheet className="h-4 w-4" />تصدير</Button>
          </div>

          {branchBreakdown.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">الموظفون حسب الفرع</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                      <BarChart data={branchBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="employees" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="موظفون" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">الرواتب حسب الفرع</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                      <BarChart data={branchBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="salary" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="الراتب" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-sm">تفاصيل الفروع</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>الفرع</TableHead><TableHead>الموظفون</TableHead><TableHead>الأقسام</TableHead><TableHead>إجمالي الرواتب</TableHead><TableHead>النسبة</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {branchBreakdown.map((b: any) => (
                        <TableRow key={b.name}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>{b.employees}</TableCell>
                          <TableCell>{b.departments}</TableCell>
                          <TableCell>{b.salary.toLocaleString("ar-IQ")} د.ع</TableCell>
                          <TableCell><Badge variant="outline">{employees.length > 0 ? Math.round((b.employees / employees.length) * 100) : 0}%</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">لا توجد فروع</CardContent></Card>}
        </TabsContent>

        {/* ════════════════ FINANCIAL ════════════════ */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={Wallet} value={totalSalary.toLocaleString("ar-IQ")} label="كلفة الرواتب الشهرية" sub="د.ع" />
            <KpiCard icon={Wallet} value={(totalSalary * 12).toLocaleString("ar-IQ")} label="الكلفة السنوية المقدرة" sub="د.ع" />
            <KpiCard icon={Scale} value={totalLoanAmount.toLocaleString("ar-IQ")} label="إجمالي السلف" sub="د.ع" />
            <KpiCard icon={TrendingDown} value={totalLoanRemaining.toLocaleString("ar-IQ")} label="رصيد السلف المتبقي" sub="د.ع" color="text-destructive" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">السلف والقروض</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">سلف نشطة</span><span className="font-heading font-bold">{activeLoans.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي السلف</span><span className="font-heading font-bold">{loans.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">مكتملة</span><span className="font-heading font-bold text-primary">{loans.filter((l: any) => l.status === "completed" || l.status === "paid").length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">نسبة السلف للرواتب</span><span className="font-heading font-bold">{totalSalary > 0 ? ((totalLoanRemaining / totalSalary) * 100).toFixed(1) : 0}%</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="font-heading text-sm">كلفة الموظف الواحد</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">كلفة شهرية/موظف</span><span className="font-heading font-bold">{activeEmps.length > 0 ? Math.round(totalSalary / activeEmps.length).toLocaleString("ar-IQ") : 0} د.ع</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">كلفة سنوية/موظف</span><span className="font-heading font-bold">{activeEmps.length > 0 ? (Math.round(totalSalary * 12 / activeEmps.length)).toLocaleString("ar-IQ") : 0} د.ع</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">تكلفة التدريب الإجمالية</span><span className="font-heading font-bold">{training.reduce((s: number, t: any) => s + (t.cost || 0), 0).toLocaleString("ar-IQ")} د.ع</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">تكلفة الجزاءات</span><span className="font-heading font-bold text-destructive">{filteredPenalties.reduce((s: number, p: any) => s + (p.amount || 0), 0).toLocaleString("ar-IQ")} د.ع</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
