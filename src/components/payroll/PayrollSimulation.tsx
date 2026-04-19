import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, PlayCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useWorkPolicies, usePolicyAssignments, resolveEmployeePolicy, type WorkPolicy } from "@/hooks/useWorkPolicy";

function fmt(n: number) { return (n || 0).toLocaleString("ar-IQ"); }

interface SimResult {
  employee: any;
  attendance: {
    scheduled_days: number; worked_days: number; absent_days: number;
    paid_leave_days: number; unpaid_leave_days: number;
    late_minutes: number; late_incidents: number; early_leave_minutes: number;
    overtime_hours: number; weekend_worked_hours: number; holiday_worked_hours: number;
  };
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  gross: number; totalDeductions: number; net: number;
  daily_rate: number; hourly_rate: number;
}

interface Props {
  month: number;
  year: number;
  onConfirm: (results: SimResult[]) => void;
  isPending?: boolean;
}

function calculateIraqiIncomeTax(annualTaxableIncome: number): number {
  let tax = 0, remaining = annualTaxableIncome;
  const brackets = [
    { limit: 250000, rate: 0.03 }, { limit: 250000, rate: 0.05 },
    { limit: 500000, rate: 0.10 }, { limit: Infinity, rate: 0.15 },
  ];
  for (const b of brackets) {
    const taxable = Math.min(remaining, b.limit);
    tax += taxable * b.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return tax / 12;
}

export default function PayrollSimulation({ month, year, onConfirm, isPending }: Props) {
  const { companyId } = useCompany();
  const [results, setResults] = useState<SimResult[] | null>(null);
  const [detailEmp, setDetailEmp] = useState<SimResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: employees = [] } = useQuery({
    queryKey: ["sim-employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: allPolicies = [] } = useWorkPolicies();
  const { data: policyAssignments = [] } = usePolicyAssignments();

  // Legacy compat: get default policy
  const policy = allPolicies.find(p => p.is_default) || allPolicies[0] || null;

  const { data: empSalaryComponents = [] } = useQuery({
    queryKey: ["sim-emp-salary-comp", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employee_salary_components").select("*, salary_components(*)");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: activeLoans = [] } = useQuery({
    queryKey: ["sim-loans", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const runSimulation = async () => {
    setSimulating(true);
    try {
      // Fetch attendance records for the month
      const { data: attendanceRecords = [] } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("company_id", companyId!)
        .gte("date", firstOfMonth)
        .lte("date", lastOfMonth);

      // Fetch approved leave for the month
      const { data: leaveRequests = [] } = await supabase
        .from("leave_requests")
        .select("*, leave_types(is_paid)")
        .eq("company_id", companyId!)
        .eq("status", "approved")
        .lte("start_date", lastOfMonth)
        .gte("end_date", firstOfMonth);

      // Fetch holidays
      const { data: holidays = [] } = await supabase
        .from("public_holidays")
        .select("date")
        .eq("company_id", companyId!)
        .gte("date", firstOfMonth)
        .lte("date", lastOfMonth);

      const holidayDates = new Set((holidays || []).map((h: any) => h.date));

      // workingDays now computed per-employee based on their assigned policy

      const simResults: SimResult[] = employees.map((emp: any) => {
        // Resolve per-employee policy
        const p: any = allPolicies.length > 0
          ? resolveEmployeePolicy(emp, allPolicies, policyAssignments)
          : {};

        const basic = emp.basic_salary || 0;
        const standardHours = p.standard_hours_per_day || 8;
        const graceMin = p.late_grace_minutes || 10;
        const weekendDaySet = new Set((p.weekend_days || ["fri", "sat"]).map((d: string) => {
          const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
          return map[d] ?? -1;
        }));

        // Calculate working days using policy weekend days
        const workingDays = (() => {
          let count = 0;
          const d = new Date(firstOfMonth);
          while (d.getMonth() + 1 === month && d.getFullYear() === year) {
            const dow = d.getDay();
            const dateStr = d.toISOString().split("T")[0];
            if (!weekendDaySet.has(dow) && !holidayDates.has(dateStr)) count++;
            d.setDate(d.getDate() + 1);
          }
          return count;
        })();

        // Daily rate based on policy
        let dailyRate: number;
        if (p.salary_basis === "monthly_calendar") dailyRate = basic / lastDay;
        else if (p.salary_basis === "monthly_working") dailyRate = workingDays > 0 ? basic / workingDays : 0;
        else dailyRate = basic / 30;

        const hourlyRate = dailyRate / standardHours;

        const empRecords = (attendanceRecords || []).filter((r: any) => r.employee_id === emp.id);
        const workedDays = empRecords.length;
        let totalOT = 0, lateMinutes = 0, lateIncidents = 0, earlyLeaveMinutes = 0;
        let weekendHours = 0, holidayHours = 0;

        empRecords.forEach((r: any) => {
          totalOT += r.overtime_hours || 0;
          // Late check
          if (r.check_in) {
            const ci = new Date(r.check_in);
            const startHour = parseInt((p as any)?.working_hours_start?.split(":")[0] || "8");
            const startMin = parseInt((p as any)?.working_hours_start?.split(":")[1] || "0");
            const lateMin = (ci.getHours() * 60 + ci.getMinutes()) - (startHour * 60 + startMin);
            if (lateMin > graceMin) { lateMinutes += lateMin; lateIncidents++; }
          }
          // Early leave check
          if (r.check_out) {
            const co = new Date(r.check_out);
            const endHour = parseInt((p as any)?.working_hours_end?.split(":")[0] || "16");
            const endMin = parseInt((p as any)?.working_hours_end?.split(":")[1] || "0");
            const earlyMin = (endHour * 60 + endMin) - (co.getHours() * 60 + co.getMinutes());
            if (earlyMin > 0) earlyLeaveMinutes += earlyMin;
          }
          // Weekend/holiday work
          const d = new Date(r.date);
          const dow = d.getDay();
          if (weekendDaySet.has(dow)) weekendHours += r.hours_worked || standardHours;
          if (holidayDates.has(r.date)) holidayHours += r.hours_worked || standardHours;
        });

        // Leave aggregation
        let paidLeaveDays = 0, unpaidLeaveDays = 0;
        (leaveRequests || []).filter((lr: any) => lr.employee_id === emp.id).forEach((lr: any) => {
          const start = new Date(Math.max(new Date(lr.start_date).getTime(), new Date(firstOfMonth).getTime()));
          const end = new Date(Math.min(new Date(lr.end_date).getTime(), new Date(lastOfMonth).getTime()));
          const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
          const halfDay = lr.is_half_day ? 0.5 : days;
          if (lr.leave_types?.is_paid) paidLeaveDays += halfDay;
          else unpaidLeaveDays += halfDay;
        });

        const absentDays = Math.max(0, workingDays - workedDays - paidLeaveDays - unpaidLeaveDays);

        // Proration for new joiners
        let proratedBasic = basic;
        if (p.proration_enabled && emp.hire_date) {
          const hd = new Date(emp.hire_date);
          if (hd.getFullYear() === year && hd.getMonth() + 1 === month && hd.getDate() > 1) {
            const daysWorked = p.proration_basis === "working_days"
              ? Math.max(0, workingDays - Math.round((hd.getDate() - 1) * workingDays / lastDay))
              : lastDay - hd.getDate() + 1;
            const totalBasis = p.proration_basis === "working_days" ? workingDays : lastDay;
            proratedBasic = totalBasis > 0 ? Math.round((basic / totalBasis) * daysWorked * 100) / 100 : 0;
          }
        }

        // Salary components
        const empComps = empSalaryComponents.filter((c: any) => c.employee_id === emp.id);
        let allowances = 0, extraDeductions = 0;
        empComps.forEach((ec: any) => {
          const sc = ec.salary_components;
          if (!sc) return;
          const amt = sc.calculation_type === "percentage" ? proratedBasic * ((sc.percentage || 0) / 100) : (ec.amount || sc.amount || 0);
          if (sc.type === "earning") allowances += amt;
          else extraDeductions += amt;
        });

        // Build earnings
        const earnings: { label: string; amount: number }[] = [
          { label: "الراتب الأساسي", amount: Math.round(proratedBasic) },
        ];
        if (allowances > 0) earnings.push({ label: "البدلات", amount: Math.round(allowances) });

        // Overtime pay
        let overtimePay = 0;
        if (p.overtime_enabled && totalOT > 0) {
          overtimePay = Math.round(hourlyRate * totalOT * (p.overtime_multiplier || 1.5));
          earnings.push({ label: `عمل إضافي (${Math.round(totalOT * 10) / 10} ساعة)`, amount: overtimePay });
        }

        // Weekend/holiday compensation
        let weekendPay = 0, holidayPay = 0;
        if (p.overtime_enabled && weekendHours > 0) {
          weekendPay = Math.round(hourlyRate * weekendHours * (p.weekend_work_multiplier || 1.5));
          earnings.push({ label: "تعويض نهاية الأسبوع", amount: weekendPay });
        }
        if (p.overtime_enabled && holidayHours > 0) {
          holidayPay = Math.round(hourlyRate * holidayHours * (p.holiday_work_multiplier || 2.0));
          earnings.push({ label: "تعويض أيام العطل", amount: holidayPay });
        }

        const gross = proratedBasic + allowances + overtimePay + weekendPay + holidayPay;

        // Build deductions
        const deductions: { label: string; amount: number }[] = [];

        let absenceDeduction = 0;
        if (p.absence_deduction_enabled && absentDays > 0) {
          absenceDeduction = Math.round(dailyRate * absentDays);
          deductions.push({ label: `خصم غياب (${absentDays} يوم)`, amount: absenceDeduction });
        }

        let unpaidLeaveDeduction = 0;
        if (p.unpaid_leave_deduction_enabled && unpaidLeaveDays > 0) {
          unpaidLeaveDeduction = Math.round(dailyRate * unpaidLeaveDays);
          deductions.push({ label: `إجازة بدون راتب (${unpaidLeaveDays} يوم)`, amount: unpaidLeaveDeduction });
        }

        let lateDeduction = 0;
        if (p.late_deduction_enabled && (lateMinutes > 0 || lateIncidents > 0)) {
          lateDeduction = p.late_deduction_type === "per_incident"
            ? Math.round(lateIncidents * (p.late_deduction_rate || 0))
            : Math.round(lateMinutes * (p.late_deduction_rate || 0));
          if (lateDeduction > 0) deductions.push({ label: `خصم تأخير (${lateMinutes} دقيقة)`, amount: lateDeduction });
        }

        let earlyDeduction = 0;
        if (p.early_leave_deduction_enabled && earlyLeaveMinutes > 0) {
          earlyDeduction = Math.round(earlyLeaveMinutes * (p.early_leave_deduction_rate || 0));
          if (earlyDeduction > 0) deductions.push({ label: `خصم خروج مبكر (${earlyLeaveMinutes} دقيقة)`, amount: earlyDeduction });
        }

        const monthlyTax = p.income_tax_enabled ? calculateIraqiIncomeTax(gross * 12) : 0;
        if (monthlyTax > 0) deductions.push({ label: "ضريبة الدخل", amount: Math.round(monthlyTax) });

        const ssEmployee = Math.round(gross * (p.social_security_employee_pct || 5) / 100);
        if (ssEmployee > 0) deductions.push({ label: "تأمينات اجتماعية", amount: ssEmployee });

        if (extraDeductions > 0) deductions.push({ label: "خصومات مكونات الراتب", amount: Math.round(extraDeductions) });

        const empLoans = activeLoans.filter((l: any) => l.employee_id === emp.id);
        const loanDeduction = empLoans.reduce((s: number, l: any) => s + (l.monthly_deduction || 0), 0);
        if (loanDeduction > 0) deductions.push({ label: "أقساط سلف", amount: loanDeduction });

        const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
        const net = gross - totalDed;

        return {
          employee: emp,
          attendance: {
            scheduled_days: workingDays, worked_days: workedDays, absent_days: absentDays,
            paid_leave_days: paidLeaveDays, unpaid_leave_days: unpaidLeaveDays,
            late_minutes: lateMinutes, late_incidents: lateIncidents, early_leave_minutes: earlyLeaveMinutes,
            overtime_hours: totalOT, weekend_worked_hours: weekendHours, holiday_worked_hours: holidayHours,
          },
          earnings, deductions, gross: Math.round(gross), totalDeductions: Math.round(totalDed), net: Math.round(net),
          daily_rate: Math.round(dailyRate), hourly_rate: Math.round(hourlyRate * 100) / 100,
        };
      });

      setResults(simResults);
    } finally {
      setSimulating(false);
    }
  };

  const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-lg">محاكاة الرواتب — {MONTHS_AR[month - 1]} {year}</h3>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 font-heading" onClick={runSimulation} disabled={simulating}>
            <PlayCircle className="h-4 w-4" />{simulating ? "جاري المحاكاة..." : "تشغيل المحاكاة"}
          </Button>
          {results && (
            <Button className="gap-2 font-heading" onClick={() => onConfirm(results)} disabled={isPending}>
              <CheckCircle className="h-4 w-4" />{isPending ? "جاري التأكيد..." : "تأكيد وتشغيل الرواتب"}
            </Button>
          )}
        </div>
      </div>

      {!policy && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            لم يتم تكوين سياسة رواتب. سيتم استخدام الإعدادات الافتراضية. يمكنك إعداد السياسة من الإعدادات → قواعد الرواتب.
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">نتائج المحاكاة ({results.length} موظف)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>أيام عمل</TableHead>
                  <TableHead>غياب</TableHead>
                  <TableHead>إضافي</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الخصومات</TableHead>
                  <TableHead>الصافي</TableHead>
                  <TableHead>تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.employee.id}>
                    <TableCell className="font-medium">{r.employee.name_ar}</TableCell>
                    <TableCell>{r.attendance.worked_days}/{r.attendance.scheduled_days}</TableCell>
                    <TableCell>
                      {r.attendance.absent_days > 0 ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">{r.attendance.absent_days}</Badge>
                      ) : "0"}
                    </TableCell>
                    <TableCell>{r.attendance.overtime_hours > 0 ? `${Math.round(r.attendance.overtime_hours * 10) / 10}h` : "—"}</TableCell>
                    <TableCell>{fmt(r.gross)}</TableCell>
                    <TableCell className="text-destructive">{fmt(r.totalDeductions)}</TableCell>
                    <TableCell className="font-bold text-primary">{fmt(r.net)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailEmp(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailEmp} onOpenChange={() => setDetailEmp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">تفاصيل محاكاة — {detailEmp?.employee.name_ar}</DialogTitle>
          </DialogHeader>
          {detailEmp && (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-heading font-bold text-sm mb-2">بيانات الحضور المستخدمة</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">أيام مجدولة</p><p className="font-bold">{detailEmp.attendance.scheduled_days}</p></div>
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">أيام حضور</p><p className="font-bold">{detailEmp.attendance.worked_days}</p></div>
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">غياب</p><p className="font-bold text-destructive">{detailEmp.attendance.absent_days}</p></div>
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">إجازة مدفوعة</p><p className="font-bold">{detailEmp.attendance.paid_leave_days}</p></div>
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">إجازة غير مدفوعة</p><p className="font-bold">{detailEmp.attendance.unpaid_leave_days}</p></div>
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">تأخير (دقائق)</p><p className="font-bold">{detailEmp.attendance.late_minutes}</p></div>
                  <div className="bg-muted rounded p-2 text-center"><p className="text-xs text-muted-foreground">عمل إضافي</p><p className="font-bold">{Math.round(detailEmp.attendance.overtime_hours * 10) / 10}h</p></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">المعدل اليومي: {fmt(detailEmp.daily_rate)} د.ع • الساعة: {fmt(detailEmp.hourly_rate)} د.ع</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-heading font-bold text-sm text-primary mb-2">الاستحقاقات</h4>
                {detailEmp.earnings.map((e, i) => (
                  <div key={i} className="flex justify-between py-1"><span>{e.label}</span><span className="font-medium">{fmt(e.amount)} د.ع</span></div>
                ))}
                <div className="flex justify-between py-1 font-bold border-t mt-1 pt-1"><span>الإجمالي</span><span className="text-primary">{fmt(detailEmp.gross)} د.ع</span></div>
              </div>
              <Separator />
              <div>
                <h4 className="font-heading font-bold text-sm text-destructive mb-2">الاستقطاعات</h4>
                {detailEmp.deductions.map((d, i) => (
                  <div key={i} className="flex justify-between py-1"><span>{d.label}</span><span className="font-medium">{fmt(d.amount)} د.ع</span></div>
                ))}
                <div className="flex justify-between py-1 font-bold border-t mt-1 pt-1"><span>الإجمالي</span><span className="text-destructive">{fmt(detailEmp.totalDeductions)} د.ع</span></div>
              </div>
              <Separator />
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">صافي الراتب</p>
                <p className="text-2xl font-heading font-bold text-primary">{fmt(detailEmp.net)} د.ع</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
