import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Archive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyBranding, useSaveGeneratedDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

interface PayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  run: any;
  employee?: any;
  companyName?: string;
}

function fmt(n: number) {
  return (n || 0).toLocaleString("ar-IQ");
}

export function PayslipDialog({ open, onOpenChange, item, run, employee, companyName }: PayslipDialogProps) {
  const { data: company } = useCompanyBranding();
  const saveDoc = useSaveGeneratedDocument();
  const { toast } = useToast();

  const monthLabel = run ? MONTHS_AR[(run.month || 1) - 1] : "";
  const empName = item?.employees?.name_ar || employee?.name_ar || "—";
  const empCode = employee?.employee_code || "—";
  const empDept = employee?.position || "—";
  const c = company as any;

  const { data: attendanceSummary } = useQuery({
    queryKey: ["payslip-attendance-summary", run?.id, item?.employee_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_attendance_summary")
        .select("*")
        .eq("payroll_run_id", run!.id)
        .eq("employee_id", item!.employee_id)
        .maybeSingle();
      return data;
    },
    enabled: !!item?.employee_id && !!run?.id && open,
  });

  const { data: empLoans = [] } = useQuery({
    queryKey: ["payslip-loans", item?.employee_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("loan_payments")
        .select("amount, loans(loan_type, employee_id)")
        .eq("payroll_run_id", run!.id);
      return (data || []).filter((p: any) => p.loans?.employee_id === item!.employee_id);
    },
    enabled: !!item?.employee_id && !!run?.id && open,
  });

  const { data: empComponents = [] } = useQuery({
    queryKey: ["payslip-components", item?.employee_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_salary_components")
        .select("amount, salary_components(name, type)")
        .eq("employee_id", item!.employee_id);
      return data || [];
    },
    enabled: !!item?.employee_id && open,
  });

  if (!item || !run) return null;

  const allowanceComponents = empComponents.filter((c: any) => c.salary_components?.type === "allowance" && (c.amount || 0) > 0);
  const deductionComponents = empComponents.filter((c: any) => c.salary_components?.type === "deduction" && (c.amount || 0) > 0);
  const loanTotal = empLoans.reduce((s: number, l: any) => s + (l.amount || 0), 0);

  // Build earnings list with rule-based items
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

  const handlePrint = () => {
    const content = buildPayslipText();
    const html = buildOfficialDocumentHtml(c, content);
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const buildPayslipText = () => {
    let text = `كشف راتب - ${monthLabel} ${run.year}\n\n`;
    text += `الموظف: ${empName}\nالرقم الوظيفي: ${empCode}\nالمنصب: ${empDept}\n\n`;
    if (attendanceSummary) {
      text += `=== بيانات الحضور ===\n`;
      text += `أيام العمل: ${attendanceSummary.worked_days}/${attendanceSummary.scheduled_days}\n`;
      if (attendanceSummary.absent_days > 0) text += `غياب: ${attendanceSummary.absent_days} يوم\n`;
      if (attendanceSummary.overtime_hours > 0) text += `عمل إضافي: ${Math.round(attendanceSummary.overtime_hours * 10) / 10} ساعة\n`;
      text += `\n`;
    }
    text += `=== الاستحقاقات ===\n`;
    earnings.forEach(e => { text += `${e.label}: ${fmt(e.amount)} د.ع\n`; });
    text += `إجمالي الاستحقاقات: ${fmt(item.gross_salary || 0)} د.ع\n\n`;
    text += `=== الاستقطاعات ===\n`;
    deductions.forEach(d => { text += `${d.label}: ${fmt(d.amount)} د.ع\n`; });
    text += `إجمالي الاستقطاعات: ${fmt(totalDeductions)} د.ع\n\n`;
    text += `صافي الراتب: ${fmt(item.net_salary || 0)} د.ع\n`;
    text += `حصة صاحب العمل في التأمينات: ${fmt(item.social_security_employer || 0)} د.ع`;
    return text;
  };

  const handleArchive = async () => {
    try {
      await saveDoc.mutateAsync({
        employeeId: item.employee_id,
        documentType: "payslip",
        content: buildPayslipText(),
        visibilityScope: "employee",
        metadata: { month: run.month, year: run.year, net_salary: item.net_salary },
      });
      toast({ title: "تم حفظ كشف الراتب في الأرشيف" });
    } catch {
      toast({ title: "خطأ في الأرشفة", variant: "destructive" });
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFont("Helvetica", "normal");
    const cName = c?.name_ar || c?.name || companyName || "Tamkeen HR";

    doc.setFontSize(18);
    doc.text(cName, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Payslip - ${monthLabel} ${run.year}`, 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Employee: ${empName}`, 20, 43);
    doc.text(`Code: ${empCode}`, 20, 50);
    doc.text(`Position: ${empDept}`, 120, 43);
    doc.text(`Period: ${run.month}/${run.year}`, 120, 50);

    // Attendance summary if available
    let startY = 58;
    if (attendanceSummary) {
      (doc as any).autoTable({
        startY,
        head: [["Attendance", "Value"]],
        body: [
          ["Worked Days", `${attendanceSummary.worked_days}/${attendanceSummary.scheduled_days}`],
          ["Absent Days", String(attendanceSummary.absent_days)],
          ["Overtime Hours", String(Math.round((attendanceSummary.overtime_hours || 0) * 10) / 10)],
          ["Late Minutes", String(attendanceSummary.late_minutes)],
        ],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [100, 100, 100] },
        margin: { left: 20, right: 20 },
      });
      startY = (doc as any).lastAutoTable.finalY + 5;
    }

    (doc as any).autoTable({
      startY,
      head: [["Earnings", "Amount"]],
      body: earnings.map(e => [e.label, fmt(e.amount)]),
      foot: [["Total", fmt(item.gross_salary || 0)]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [6, 78, 59] },
      footStyles: { fillColor: [6, 78, 59], textColor: 255 },
      margin: { left: 20, right: 110 },
      tableWidth: 80,
    });

    const earningsEndY = (doc as any).lastAutoTable.finalY;
    (doc as any).autoTable({
      startY,
      head: [["Deductions", "Amount"]],
      body: deductions.map(d => [d.label, fmt(d.amount)]),
      foot: [["Total", fmt(totalDeductions)]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [153, 27, 27] },
      footStyles: { fillColor: [153, 27, 27], textColor: 255 },
      margin: { left: 110, right: 20 },
      tableWidth: 80,
    });

    const finalY = Math.max(earningsEndY, (doc as any).lastAutoTable.finalY) + 15;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text(`Net Salary: ${fmt(item.net_salary || 0)} IQD`, 105, finalY, { align: "center" });

    if (c?.signatory_name) {
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.text(c.signatory_name, 30, finalY + 25);
      if (c.signatory_title) doc.text(c.signatory_title, 30, finalY + 31);
    }

    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(120);
    const footerText = c?.footer_template || [c?.address, c?.phone, c?.email].filter(Boolean).join(" | ") || "Tamkeen HR";
    doc.text(footerText, 105, pageH - 10, { align: "center" });

    doc.save(`payslip_${empCode}_${run.year}_${run.month}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg print:max-w-none print:shadow-none">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            كشف راتب — {monthLabel} {run.year}
          </DialogTitle>
        </DialogHeader>

        {c?.logo_url && (
          <div className="text-center">
            <img src={c.logo_url} alt="شعار" className="h-12 mx-auto object-contain" />
          </div>
        )}
        {(c?.name_ar || c?.name) && (
          <p className="text-center font-heading font-bold text-sm" style={{ color: c?.primary_color || undefined }}>
            {c.name_ar || c.name}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-muted-foreground">الموظف</p><p className="font-medium">{empName}</p></div>
          <div><p className="text-muted-foreground">الرقم الوظيفي</p><p className="font-medium">{empCode}</p></div>
          <div><p className="text-muted-foreground">المنصب</p><p className="font-medium">{empDept}</p></div>
          <div><p className="text-muted-foreground">الفترة</p><p className="font-medium">{monthLabel} {run.year}</p></div>
        </div>

        {/* Attendance summary badge */}
        {attendanceSummary && (
          <>
            <Separator />
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
          </>
        )}

        <Separator />

        <div>
          <h3 className="font-heading font-bold text-sm text-primary mb-2">الاستحقاقات</h3>
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

        <Separator />

        <div>
          <h3 className="font-heading font-bold text-sm text-destructive mb-2">الاستقطاعات</h3>
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

        <Separator />

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">صافي الراتب</p>
          <p className="text-3xl font-heading font-bold text-primary mt-1">{fmt(item.net_salary || 0)} د.ع</p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          حصة صاحب العمل في التأمينات: {fmt(item.social_security_employer || 0)} د.ع
        </p>

        {c?.stamp_url && (
          <div className="text-center">
            <img src={c.stamp_url} alt="ختم" className="h-10 mx-auto object-contain opacity-50" />
          </div>
        )}

        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={handlePrint}>
            <Printer className="h-4 w-4" />طباعة
          </Button>
          <Button className="flex-1 gap-2 font-heading" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" />تحميل PDF
          </Button>
          <Button variant="secondary" className="gap-2 font-heading" onClick={handleArchive} disabled={saveDoc.isPending}>
            <Archive className="h-4 w-4" />أرشفة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
