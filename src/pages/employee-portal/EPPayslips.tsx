import { Wallet, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function EPPayslips() {
  const { companyId } = useCompany();
  const { user } = useAuth();

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, employee_code").eq("company_id", companyId!).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ["ep-payslips", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_items").select("*, payroll_runs(month, year, status, currency)").eq("employee_id", myEmployee!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const printPayslip = (ps: any) => {
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>كشف راتب</title>
    <style>body{font-family:Arial;padding:40px;direction:rtl}table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{border:1px solid #ddd;padding:10px;text-align:right}th{background:#f5f5f5}
    .total{font-weight:bold;font-size:1.2em;color:#2563eb}@media print{body{padding:20px}}</style></head><body>
    <h1 style="text-align:center">كشف راتب</h1><p style="text-align:center">${monthNames[(ps.payroll_runs?.month||1)-1]} ${ps.payroll_runs?.year}</p>
    <table><thead><tr><th>البند</th><th>المبلغ</th></tr></thead><tbody>
    <tr><td>الراتب الأساسي</td><td>${(ps.basic_salary||0).toLocaleString()}</td></tr>
    <tr><td>البدلات</td><td>${(ps.allowances||0).toLocaleString()}</td></tr>
    <tr><td>الإجمالي</td><td>${(ps.gross_salary||0).toLocaleString()}</td></tr>
    <tr><td>الخصومات</td><td style="color:red">-${((ps.income_tax||0)+(ps.social_security_employee||0)+(ps.other_deductions||0)).toLocaleString()}</td></tr>
    <tr><td class="total">الصافي</td><td class="total">${(ps.net_salary||0).toLocaleString()}</td></tr>
    </tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  if (!myEmployee) return <div className="text-center py-16 text-muted-foreground">لم يتم ربط حسابك بسجل موظف</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading font-bold text-2xl">كشوف رواتبي</h1>
      <Card>
        <CardContent className="pt-6">
          {payslips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشهر</TableHead><TableHead>الأساسي</TableHead><TableHead>إضافي</TableHead><TableHead>الإجمالي</TableHead><TableHead>خصومات</TableHead><TableHead>الصافي</TableHead><TableHead>طباعة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((ps: any) => (
                  <TableRow key={ps.id}>
                    <TableCell className="font-heading">{monthNames[(ps.payroll_runs?.month||1)-1]} {ps.payroll_runs?.year}</TableCell>
                    <TableCell>{(ps.basic_salary||0).toLocaleString("ar-IQ")}</TableCell>
                    <TableCell className="text-primary">{(ps.overtime_pay||0) > 0 ? (ps.overtime_pay||0).toLocaleString("ar-IQ") : "—"}</TableCell>
                    <TableCell>{(ps.gross_salary||0).toLocaleString("ar-IQ")}</TableCell>
                    <TableCell className="text-destructive">{((ps.absence_deduction||0)+(ps.late_deduction||0)+(ps.income_tax||0)+(ps.social_security_employee||0)).toLocaleString("ar-IQ")}</TableCell>
                    <TableCell className="font-bold text-primary">{(ps.net_salary||0).toLocaleString("ar-IQ")}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => printPayslip(ps)}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">لا توجد كشوف رواتب</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
