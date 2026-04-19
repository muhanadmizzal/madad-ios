import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function TahseelExpenses() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", expense_type: "general", expense_date: "" });

  const { data: expenses } = useQuery({
    queryKey: ["tahseel-expenses", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_expenses").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("tahseel_expenses").insert({
        company_id: companyId,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        expense_type: form.expense_type,
        expense_date: form.expense_date || new Date().toISOString().split("T")[0],
        created_by: session?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tahseel-expenses"] });
      toast.success(t("تم إضافة المصروف", "Expense added"));
      setOpen(false);
      setForm({ description: "", amount: "", expense_type: "general", expense_date: "" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  const typeLabels: Record<string, string> = { payroll: t("رواتب", "Payroll"), inventory: t("مخزون", "Inventory"), general: t("عام", "General"), operational: t("تشغيلي", "Operational") };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("المصروفات", "Expenses")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("تتبع وإدارة المصروفات", "Track and manage expenses")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#0FA968" }}><Plus className="h-4 w-4 me-1" />{t("مصروف جديد", "New Expense")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إضافة مصروف", "Add Expense")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("الوصف", "Description")}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>{t("المبلغ", "Amount")}</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div>
                <Label>{t("النوع", "Type")}</Label>
                <Select value={form.expense_type} onValueChange={v => setForm(f => ({ ...f, expense_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t("عام", "General")}</SelectItem>
                    <SelectItem value="payroll">{t("رواتب", "Payroll")}</SelectItem>
                    <SelectItem value="inventory">{t("مخزون", "Inventory")}</SelectItem>
                    <SelectItem value="operational">{t("تشغيلي", "Operational")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("التاريخ", "Date")}</Label><Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.description || !form.amount} style={{ background: "#0FA968" }}>
                {t("إضافة", "Add")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("الوصف", "Description")}</TableHead>
                <TableHead>{t("النوع", "Type")}</TableHead>
                <TableHead>{t("المبلغ", "Amount")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell>{exp.description || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[exp.expense_type] || exp.expense_type}</Badge></TableCell>
                  <TableCell className="font-medium">{Number(exp.amount).toLocaleString()} IQD</TableCell>
                  <TableCell>{exp.expense_date}</TableCell>
                  <TableCell><Badge variant={exp.status === "paid" ? "default" : "secondary"}>{exp.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!expenses?.length && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("لا توجد مصروفات", "No expenses")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
