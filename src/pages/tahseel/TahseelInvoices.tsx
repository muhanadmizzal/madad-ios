import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Search } from "lucide-react";
import { toast } from "sonner";

export default function TahseelInvoices() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ customer_name: "", subtotal: "", tax_rate: "0", due_date: "", notes: "" });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["tahseel-invoices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_invoices").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const subtotal = parseFloat(form.subtotal) || 0;
      const taxRate = parseFloat(form.tax_rate) || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("tahseel_invoices").insert({
        company_id: companyId,
        invoice_number: invNum,
        customer_name: form.customer_name,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        due_date: form.due_date || null,
        notes: form.notes || null,
        created_by: session?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tahseel-invoices"] });
      toast.success(t("تم إنشاء الفاتورة", "Invoice created"));
      setOpen(false);
      setForm({ customer_name: "", subtotal: "", tax_rate: "0", due_date: "", notes: "" });
    },
    onError: () => toast.error(t("خطأ في إنشاء الفاتورة", "Error creating invoice")),
  });

  const filtered = invoices?.filter(i => !search || i.customer_name?.includes(search) || i.invoice_number?.includes(search)) || [];

  const statusColors: Record<string, string> = { draft: "secondary", sent: "default", paid: "default", overdue: "destructive", cancelled: "outline" };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("الفواتير", "Invoices")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("إدارة فواتير العملاء", "Manage customer invoices")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#0FA968" }}><Plus className="h-4 w-4 me-1" />{t("فاتورة جديدة", "New Invoice")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إنشاء فاتورة", "Create Invoice")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("اسم العميل", "Customer Name")}</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div><Label>{t("المبلغ", "Subtotal")}</Label><Input type="number" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} /></div>
              <div><Label>{t("نسبة الضريبة %", "Tax Rate %")}</Label><Input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} /></div>
              <div><Label>{t("تاريخ الاستحقاق", "Due Date")}</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>{t("ملاحظات", "Notes")}</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.customer_name || !form.subtotal} style={{ background: "#0FA968" }}>
                {t("إنشاء", "Create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="ps-9" placeholder={t("بحث...", "Search...")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم الفاتورة", "Invoice #")}</TableHead>
                <TableHead>{t("العميل", "Customer")}</TableHead>
                <TableHead>{t("المبلغ", "Total")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead>{t("تاريخ الاستحقاق", "Due Date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customer_name || "—"}</TableCell>
                  <TableCell className="font-medium">{Number(inv.total).toLocaleString()} IQD</TableCell>
                  <TableCell><Badge variant={statusColors[inv.status] as any || "secondary"}>{inv.status}</Badge></TableCell>
                  <TableCell>{inv.due_date || "—"}</TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("لا توجد فواتير", "No invoices")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
