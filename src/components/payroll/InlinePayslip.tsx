import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Archive, X, FileSpreadsheet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyBranding, useSaveGeneratedDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { useToast } from "@/hooks/use-toast";
import { exportPayrollToExcel } from "@/lib/export-utils";
import jsPDF from "jspdf";
import "jspdf-autotable";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function fmt(n: number) {
  return (n || 0).toLocaleString("ar-IQ");
}

interface InlinePayslipProps {
  item: any;
  run: any;
  employee?: any;
  allItems?: any[];
  onClose: () => void;
}

export function InlinePayslip({ item, run, employee, allItems, onClose }: InlinePayslipProps) {
  const { data: company } = useCompanyBranding();
  const saveDoc = useSaveGeneratedDocument();
  const { toast } = useToast();
  const c = company as any;

  const monthLabel = run ? MONTHS_AR[(run.month || 1) - 1] : "";
  const empName = item?.employees?.name_ar || employee?.name_ar || "—";
  const empCode = employee?.employee_code || "—";
  const empDept = employee?.position || "—";

  const { data: attendanceSummary } = useQuery({
    queryKey: ["inline-payslip-att", run?.id, item?.employee_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_attendance_summary")
        .select("*")
        .eq("payroll_run_id", run!.id)
        .eq("employee_id", item!.employee_id)
        .maybeSingle();
      return data;
    },
    enabled: !!item?.employee_id && !!run?.id,
  });

  const { data: empComponents = [] } = useQuery({
    queryKey: ["inline-payslip-comp", item?.employee_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_salary_components")
        .select("amount, salary_components(name, type)")
        .eq("employee_id", item!.employee_id);
      return data || [];
    },
    enabled: !!item?.employee_id,
  });

  const { data: empLoans = [] } = useQuery({
    queryKey: ["inline-payslip-loans", item?.employee_id, run?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("loan_payments")
        .select("amount, loans(loan_type, employee_id)")
        .eq("payroll_run_id", run!.id);
      return (data || []).filter((p: any) => p.loans?.employee_id === item!.employee_id);
    },
    enabled: !!item?.employee_id && !!run?.id,
  });

  if (!item || !run) return null;

  const allowanceComponents = empComponents.filter((c: any) => c.salary_components?.type === "allowance" && (c.amount || 0) > 0);
  const deductionComponents = empComponents.filter((c: any) => c.salary_components?.type === "deduction" && (c.amount || 0) > 0);

  const earnings = [
    { label: "الراتب الأساسي", amount: item.basic_salary || 0 },
    ...allowanceComponents.map((c: any) => ({ label: c.salary_components?.name || "بدل", amount: c.amount || 0 })),
    ...(allowanceComponents.length === 0 && (item.allowances || 0) > 0 ? [{ label: "البدلات", amount: item.allowances || 0 }] : []),
    ...((item.overtime_pay || 0) > 0 ? [{ label: `عمل إضافي${attendanceSummary?.overtime_hours ? ` (${Math.round(attendanceSummary.overtime_hours * 10) / 10} ساعة)` : ""}`, amount: item.overtime_pay }] : []),
    ...((item.holiday_weekend_pay || 0) > 0 ? [{ label: "تعويض عطل/نهاية أسبوع", amount: item.holiday_weekend_pay }] : []),
  ];

  const deductions = [
    ...((item.absence_deduction || 0) > 0 ? [{ label: `خصم غياب${attendanceSummary?.absent_days ? ` (${attendanceSummary.absent_days} يوم)` : ""}`, amount: item.absence_deduction }] : []),
    ...((item.unpaid_leave_deduction || 0) > 0 ? [{ label: `إجازة بدون راتب${attendanceSummary?.unpaid_leave_days ? ` (${attendanceSummary.unpaid_leave_days} يوم)` : ""}`, amount: item.unpaid_leave_deduction }] : []),
    ...((item.late_deduction || 0) > 0 ? [{ label: `خصم تأخير${attendanceSummary?.late_minutes ? ` (${attendanceSummary.late_minutes} دقيقة)` : ""}`, amount: item.late_deduction }] : []),
    { label: "ضريبة الدخل", amount: item.income_tax || 0 },
    { label: "التأمينات الاجتماعية (موظف)", amount: item.social_security_employee || 0 },
    ...deductionComponents.map((c: any) => ({ label: c.salary_components?.name || "خصم", amount: c.amount || 0 })),
    ...empLoans.map((l: any) => ({ label: `قسط سلفة (${l.loans?.loan_type === "personal" ? "شخصية" : l.loans?.loan_type === "housing" ? "سكن" : "سلفة"})`, amount: l.amount || 0 })),
    ...(deductionComponents.length === 0 && empLoans.length === 0 && (item.other_deductions || 0) > 0 ? [{ label: "خصومات أخرى", amount: item.other_deductions || 0 }] : []),
  ].filter(d => d.amount > 0);

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);

  const handleArchive = async () => {
    try {
      let text = `كشف راتب - ${monthLabel} ${run.year}\n\nالموظف: ${empName}\n`;
      earnings.forEach(e => { text += `${e.label}: ${fmt(e.amount)} د.ع\n`; });
      text += `\nصافي الراتب: ${fmt(item.net_salary || 0)} د.ع`;
      await saveDoc.mutateAsync({
        employeeId: item.employee_id,
        documentType: "payslip",
        content: text,
        visibilityScope: "employee",
        metadata: { month: run.month, year: run.year, net_salary: item.net_salary },
      });
      toast({ title: "تم حفظ كشف الراتب في الأرشيف" });
    } catch {
      toast({ title: "خطأ في الأرشفة", variant: "destructive" });
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base text-foreground">
          كشف راتب — {empName} — {monthLabel} {run.year}
        </h3>
        <div className="flex items-center gap-2">
          {allItems && (
            <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={() => exportPayrollToExcel(run, allItems)}>
              <FileSpreadsheet className="h-4 w-4" />Excel
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={handleArchive} disabled={saveDoc.isPending}>
            <Archive className="h-4 w-4" />أرشفة
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><p className="text-muted-foreground text-xs">الموظف</p><p className="font-medium">{empName}</p></div>
        <div><p className="text-muted-foreground text-xs">الرقم الوظيفي</p><p className="font-medium">{empCode}</p></div>
        <div><p className="text-muted-foreground text-xs">المنصب</p><p className="font-medium">{empDept}</p></div>
        <div><p className="text-muted-foreground text-xs">الفترة</p><p className="font-medium">{monthLabel} {run.year}</p></div>
      </div>

      {attendanceSummary && (
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-muted rounded p-2">
            <p className="text-muted-foreground">حضور</p>
            <p className="font-bold">{attendanceSummary.worked_days}/{attendanceSummary.scheduled_days}</p>
          </div>
          <div className="bg-muted rounded p-2">
            <p className="text-muted-foreground">غياب</p>
            <p className="font-bold text-destructive">{attendanceSummary.absent_days}</p>
          </div>
          <div className="bg-muted rounded p-2">
            <p className="text-muted-foreground">إضافي</p>
            <p className="font-bold text-primary">{Math.round((attendanceSummary.overtime_hours || 0) * 10) / 10}h</p>
          </div>
          <div className="bg-muted rounded p-2">
            <p className="text-muted-foreground">تأخير</p>
            <p className="font-bold">{attendanceSummary.late_minutes}m</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="font-heading font-bold text-sm text-primary mb-2">الاستحقاقات</h4>
          <div className="space-y-1.5">
            {earnings.map((e, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{e.label}</span><span className="font-medium">{fmt(e.amount)} د.ع</span>
              </div>
            ))}
            <Separator className="my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>إجمالي الاستحقاقات</span><span className="text-primary">{fmt(item.gross_salary || 0)} د.ع</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-heading font-bold text-sm text-destructive mb-2">الاستقطاعات</h4>
          <div className="space-y-1.5">
            {deductions.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{d.label}</span><span className="font-medium">{fmt(d.amount)} د.ع</span>
              </div>
            ))}
            <Separator className="my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>إجمالي الاستقطاعات</span><span className="text-destructive">{fmt(totalDeductions)} د.ع</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">صافي الراتب</p>
        <p className="text-3xl font-heading font-bold text-primary mt-1">{fmt(item.net_salary || 0)} د.ع</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        حصة صاحب العمل في التأمينات: {fmt(item.social_security_employer || 0)} د.ع
      </p>
    </div>
  );
}
