import { useState } from "react";
import { Plus, Banknote, CheckCircle, Clock, History, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export default function Loans() {
  const [dialog, setDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["loans", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*, employees(name_ar)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["loan-payments", paymentDialog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("loan_payments" as any).select("*").eq("loan_id", paymentDialog!.id).order("payment_date", { ascending: false });
      return data || [];
    },
    enabled: !!paymentDialog,
  });

  const addLoan = useMutation({
    mutationFn: async (formData: FormData) => {
      const amount = Number(formData.get("amount"));
      const monthly = Number(formData.get("monthly_deduction"));
      const { error } = await supabase.from("loans").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        loan_type: (formData.get("loan_type") as string) || "advance",
        amount,
        monthly_deduction: monthly,
        remaining_amount: amount,
        notes: (formData.get("notes") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      toast({ title: "تم بنجاح" });
      setDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const recordPayment = useMutation({
    mutationFn: async (formData: FormData) => {
      const amount = Number(formData.get("pay_amount"));
      const loan = paymentDialog;
      // Insert payment record
      const { error: payErr } = await supabase.from("loan_payments" as any).insert({
        loan_id: loan.id,
        amount,
        payment_method: (formData.get("pay_method") as string) || "payroll_deduction",
        notes: (formData.get("pay_notes") as string) || null,
      });
      if (payErr) throw payErr;
      // Update remaining amount
      const newRemaining = Math.max(0, (loan.remaining_amount || 0) - amount);
      const updates: any = { remaining_amount: newRemaining };
      if (newRemaining <= 0) updates.status = "paid";
      const { error: loanErr } = await supabase.from("loans").update(updates).eq("id", loan.id);
      if (loanErr) throw loanErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", "loan-payments"] });
      toast({ title: "تم تسجيل الدفعة" });
      setPaymentDialog(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const activeLoans = loans.filter((l: any) => l.status === "active");
  const paidLoans = loans.filter((l: any) => l.status === "paid");
  const totalRemaining = activeLoans.reduce((s: number, l: any) => s + (l.remaining_amount || 0), 0);
  const totalMonthlyDeductions = activeLoans.reduce((s: number, l: any) => s + (l.monthly_deduction || 0), 0);

  const renderLoanTable = (items: any[]) => (
    items.length > 0 ? (
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>القسط الشهري</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>التقدم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((l: any) => {
              const paid = (l.amount || 0) - (l.remaining_amount || 0);
              const pct = l.amount > 0 ? Math.round((paid / l.amount) * 100) : 0;
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.employees?.name_ar}</TableCell>
                  <TableCell>{l.loan_type === "advance" ? "سلفة" : "قرض"}</TableCell>
                  <TableCell>{l.amount?.toLocaleString("ar-IQ")} د.ع</TableCell>
                  <TableCell>{l.monthly_deduction?.toLocaleString("ar-IQ")} د.ع</TableCell>
                  <TableCell className="font-bold">{l.remaining_amount?.toLocaleString("ar-IQ")} د.ع</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={l.status === "active" ? "bg-accent/10 text-accent-foreground" : "bg-primary/10 text-primary"}>
                      {l.status === "active" ? "نشطة" : "مسددة"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPaymentDialog(l)} title="سجل الدفعات">
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      {l.status === "active" && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => setPaymentDialog(l)} title="تسجيل دفعة">
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    ) : (
      <Card><CardContent className="py-16 text-center text-muted-foreground">
        <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="font-heading font-medium">لا توجد سلف أو قروض</p>
      </CardContent></Card>
    )
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">السلف والقروض</h1>
          <p className="text-muted-foreground text-sm mt-1">{activeLoans.length} سلفة نشطة • {paidLoans.length} مسددة</p>
        </div>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />سلفة جديدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">سلفة / قرض جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addLoan.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>الموظف</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select name="loan_type" defaultValue="advance">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">سلفة</SelectItem>
                    <SelectItem value="loan">قرض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>المبلغ (د.ع)</Label><Input name="amount" type="number" required /></div>
                <div className="space-y-2"><Label>القسط الشهري</Label><Input name="monthly_deduction" type="number" required /></div>
              </div>
              <div className="space-y-2"><Label>ملاحظات</Label><Input name="notes" /></div>
              <Button type="submit" className="w-full font-heading" disabled={!selectedEmployee || addLoan.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><Clock className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">سلف نشطة</p><p className="text-2xl font-heading font-bold">{activeLoans.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-accent"><Banknote className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">إجمالي المتبقي</p><p className="text-2xl font-heading font-bold">{totalRemaining.toLocaleString("ar-IQ")} د.ع</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-destructive"><Receipt className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">إجمالي الأقساط الشهرية</p><p className="text-2xl font-heading font-bold">{totalMonthlyDeductions.toLocaleString("ar-IQ")} د.ع</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="font-heading">نشطة ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="paid" className="font-heading">مسددة ({paidLoans.length})</TabsTrigger>
          <TabsTrigger value="all" className="font-heading">الكل ({loans.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">{renderLoanTable(activeLoans)}</TabsContent>
        <TabsContent value="paid">{renderLoanTable(paidLoans)}</TabsContent>
        <TabsContent value="all">{renderLoanTable(loans)}</TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(o) => !o && setPaymentDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              سجل الدفعات — {paymentDialog?.employees?.name_ar}
            </DialogTitle>
          </DialogHeader>
          {paymentDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">المبلغ</p>
                  <p className="font-heading font-bold">{paymentDialog.amount?.toLocaleString("ar-IQ")}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">المسدد</p>
                  <p className="font-heading font-bold text-primary">{((paymentDialog.amount || 0) - (paymentDialog.remaining_amount || 0)).toLocaleString("ar-IQ")}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className="font-heading font-bold text-destructive">{paymentDialog.remaining_amount?.toLocaleString("ar-IQ")}</p>
                </div>
              </div>

              {paymentDialog.status === "active" && (
                <form onSubmit={(e) => { e.preventDefault(); recordPayment.mutate(new FormData(e.currentTarget)); }} className="space-y-3 p-3 rounded-lg border border-border">
                  <p className="text-sm font-heading font-bold">تسجيل دفعة جديدة</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">المبلغ</Label><Input name="pay_amount" type="number" defaultValue={paymentDialog.monthly_deduction} required /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">طريقة الدفع</Label>
                      <Select name="pay_method" defaultValue="payroll_deduction">
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payroll_deduction">خصم من الراتب</SelectItem>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input name="pay_notes" placeholder="ملاحظات (اختياري)" />
                  <Button type="submit" size="sm" className="w-full font-heading" disabled={recordPayment.isPending}>تسجيل الدفعة</Button>
                </form>
              )}

              {payments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-heading font-bold">سجل الدفعات</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الطريقة</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell dir="ltr" className="text-sm">{p.payment_date}</TableCell>
                          <TableCell>{p.amount?.toLocaleString("ar-IQ")} د.ع</TableCell>
                          <TableCell className="text-sm">{p.payment_method === "payroll_deduction" ? "خصم راتب" : p.payment_method === "cash" ? "نقدي" : "تحويل"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
