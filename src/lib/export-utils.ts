import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

interface PayrollItem {
  employees?: { name_ar: string } | null;
  basic_salary: number;
  gross_salary: number;
  income_tax: number;
  social_security_employee: number;
  social_security_employer: number;
  net_salary: number;
  allowances: number;
  other_deductions: number;
}

interface PayrollRun {
  month: number;
  year: number;
  total_gross: number | null;
  total_deductions: number | null;
  total_net: number | null;
  status: string;
  currency: string | null;
}

function fmt(n: number) {
  return n.toLocaleString("ar-IQ");
}

export function exportPayrollToExcel(run: PayrollRun, items: PayrollItem[], companyName?: string) {
  const monthLabel = MONTHS_AR[(run.month || 1) - 1];
  const title = `كشف رواتب ${monthLabel} ${run.year}`;

  const header = ["الموظف", "الراتب الأساسي", "البدلات", "الإجمالي", "ضريبة الدخل", "تأمينات الموظف", "تأمينات صاحب العمل", "خصومات أخرى", "الصافي"];

  const rows = items.map((item) => [
    item.employees?.name_ar || "-",
    item.basic_salary || 0,
    item.allowances || 0,
    item.gross_salary || 0,
    item.income_tax || 0,
    item.social_security_employee || 0,
    item.social_security_employer || 0,
    item.other_deductions || 0,
    item.net_salary || 0,
  ]);

  // Totals row
  rows.push([
    "الإجمالي",
    items.reduce((s, i) => s + (i.basic_salary || 0), 0),
    items.reduce((s, i) => s + (i.allowances || 0), 0),
    run.total_gross || 0,
    items.reduce((s, i) => s + (i.income_tax || 0), 0),
    items.reduce((s, i) => s + (i.social_security_employee || 0), 0),
    items.reduce((s, i) => s + (i.social_security_employer || 0), 0),
    items.reduce((s, i) => s + (i.other_deductions || 0), 0),
    run.total_net || 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([
    [companyName || "تمكين HR"],
    [title],
    [],
    header,
    ...rows,
  ]);

  // Set RTL
  ws["!cols"] = header.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "كشف الرواتب");

  // Set sheet RTL
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [];
  wb.Workbook.Views[0] = { RTL: true };

  XLSX.writeFile(wb, `payroll_${run.year}_${run.month}.xlsx`);
}

export function exportPayrollToPDF(run: PayrollRun, items: PayrollItem[], companyName?: string) {
  const monthLabel = MONTHS_AR[(run.month || 1) - 1];

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Use built-in Helvetica (no Arabic shaping, but numbers and layout work)
  // For Arabic text we'll use simple text rendering
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);

  // Title area
  doc.setFontSize(16);
  doc.text(companyName || "Tamkeen HR", doc.internal.pageSize.width / 2, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Payroll Report - ${monthLabel} ${run.year}`, doc.internal.pageSize.width / 2, 23, { align: "center" });

  const headers = [["Employee", "Basic Salary", "Allowances", "Gross", "Income Tax", "SS (Emp)", "SS (Employer)", "Other Ded.", "Net Salary"]];

  const rows = items.map((item) => [
    item.employees?.name_ar || "-",
    fmt(item.basic_salary || 0),
    fmt(item.allowances || 0),
    fmt(item.gross_salary || 0),
    fmt(item.income_tax || 0),
    fmt(item.social_security_employee || 0),
    fmt(item.social_security_employer || 0),
    fmt(item.other_deductions || 0),
    fmt(item.net_salary || 0),
  ]);

  // Totals
  rows.push([
    "TOTAL",
    fmt(items.reduce((s, i) => s + (i.basic_salary || 0), 0)),
    fmt(items.reduce((s, i) => s + (i.allowances || 0), 0)),
    fmt(run.total_gross || 0),
    fmt(items.reduce((s, i) => s + (i.income_tax || 0), 0)),
    fmt(items.reduce((s, i) => s + (i.social_security_employee || 0), 0)),
    fmt(items.reduce((s, i) => s + (i.social_security_employer || 0), 0)),
    fmt(items.reduce((s, i) => s + (i.other_deductions || 0), 0)),
    fmt(run.total_net || 0),
  ]);

  (doc as any).autoTable({
    head: headers,
    body: rows,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [6, 78, 59], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [6, 78, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    didParseCell: (data: any) => {
      // Bold the totals row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [209, 250, 229];
      }
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleDateString("ar-IQ")}`, 14, pageHeight - 10);
  doc.text("Tamkeen HR System", doc.internal.pageSize.width - 14, pageHeight - 10, { align: "right" });

  doc.save(`payroll_${run.year}_${run.month}.pdf`);
}

export function exportBankTransferFile(run: PayrollRun, items: PayrollItem[], employees: any[]) {
  const rows = items.map((item) => {
    const emp = employees.find((e: any) => e.name_ar === item.employees?.name_ar) || {};
    return {
      "رقم الموظف": emp.employee_code || "",
      "اسم الموظف": item.employees?.name_ar || "",
      "المبلغ": item.net_salary || 0,
      "العملة": "IQD",
      "الشهر": run.month,
      "السنة": run.year,
      "ملاحظات": `راتب شهر ${run.month}/${run.year}`,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 25 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تحويلات بنكية");
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [];
  wb.Workbook.Views[0] = { RTL: true };
  XLSX.writeFile(wb, `bank_transfer_${run.year}_${run.month}.xlsx`);
}
