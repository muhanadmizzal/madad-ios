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
import { Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function TakzeenPurchaseOrders() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", total_amount: "", expected_delivery: "", notes: "" });

  const { data: suppliers } = useQuery({
    queryKey: ["takzeen-suppliers-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_suppliers").select("id, name, name_ar").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: orders } = useQuery({
    queryKey: ["takzeen-purchase-orders", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_purchase_orders").select("*, takzeen_suppliers(name, name_ar)").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const poNum = `PO-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("takzeen_purchase_orders").insert({
        company_id: companyId,
        supplier_id: form.supplier_id,
        po_number: poNum,
        total_amount: parseFloat(form.total_amount) || 0,
        expected_delivery: form.expected_delivery || null,
        notes: form.notes || null,
        created_by: session?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["takzeen-purchase-orders"] });
      toast.success(t("تم إنشاء أمر الشراء", "Purchase order created"));
      setOpen(false);
      setForm({ supplier_id: "", total_amount: "", expected_delivery: "", notes: "" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  const statusLabels: Record<string, string> = { draft: t("مسودة", "Draft"), sent: t("مرسل", "Sent"), partial: t("جزئي", "Partial"), received: t("مستلم", "Received"), cancelled: t("ملغي", "Cancelled") };
  const statusColors: Record<string, string> = { draft: "secondary", sent: "default", partial: "outline", received: "default", cancelled: "destructive" };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("أوامر الشراء", "Purchase Orders")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("إدارة أوامر الشراء من الموردين", "Manage supplier purchase orders")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#5B21B6" }}><Plus className="h-4 w-4 me-1" />{t("أمر شراء جديد", "New PO")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إنشاء أمر شراء", "Create Purchase Order")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{t("المورد", "Supplier")}</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("اختر مورد", "Select supplier")} /></SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name_ar || s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("المبلغ الإجمالي", "Total Amount")}</Label><Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} /></div>
              <div><Label>{t("التسليم المتوقع", "Expected Delivery")}</Label><Input type="date" value={form.expected_delivery} onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} /></div>
              <div><Label>{t("ملاحظات", "Notes")}</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.supplier_id} style={{ background: "#5B21B6" }}>
                {t("إنشاء", "Create")}
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
                <TableHead>{t("رقم الأمر", "PO #")}</TableHead>
                <TableHead>{t("المورد", "Supplier")}</TableHead>
                <TableHead>{t("المبلغ", "Amount")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead>{t("التسليم المتوقع", "Expected")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.po_number}</TableCell>
                  <TableCell>{o.takzeen_suppliers?.name_ar || o.takzeen_suppliers?.name || "—"}</TableCell>
                  <TableCell className="font-medium">{Number(o.total_amount).toLocaleString()} IQD</TableCell>
                  <TableCell><Badge variant={statusColors[o.status] as any || "secondary"}>{statusLabels[o.status] || o.status}</Badge></TableCell>
                  <TableCell>{o.expected_delivery || "—"}</TableCell>
                </TableRow>
              ))}
              {!orders?.length && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("لا توجد أوامر شراء", "No purchase orders")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
