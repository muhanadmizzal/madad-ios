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
import { Plus, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";

export default function TakzeenMovements() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", movement_type: "in", quantity: "", reason: "" });

  const { data: products } = useQuery({
    queryKey: ["takzeen-products-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_products").select("id, name, name_ar, sku").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: movements } = useQuery({
    queryKey: ["takzeen-movements", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_stock_movements").select("*, takzeen_products(name, name_ar, sku)").eq("company_id", companyId).order("movement_date", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const qty = parseFloat(form.quantity) || 0;
      const { error } = await supabase.from("takzeen_stock_movements").insert({
        company_id: companyId,
        product_id: form.product_id,
        movement_type: form.movement_type,
        quantity: qty,
        reason: form.reason || null,
        reference_type: "manual",
        performed_by: session?.user?.id,
      });
      if (error) throw error;

      // Update product stock
      const product = products?.find(p => p.id === form.product_id);
      if (product) {
        const { data: current } = await supabase.from("takzeen_products").select("current_stock").eq("id", form.product_id).single();
        if (current) {
          const newStock = form.movement_type === "in" || form.movement_type === "return"
            ? Number(current.current_stock) + qty
            : form.movement_type === "out"
              ? Number(current.current_stock) - qty
              : qty; // adjustment = set directly
          await supabase.from("takzeen_products").update({ current_stock: Math.max(0, newStock) }).eq("id", form.product_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["takzeen-movements"] });
      qc.invalidateQueries({ queryKey: ["takzeen-products"] });
      toast.success(t("تم تسجيل الحركة", "Movement recorded"));
      setOpen(false);
      setForm({ product_id: "", movement_type: "in", quantity: "", reason: "" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  const typeLabels: Record<string, string> = { in: t("إدخال", "In"), out: t("إخراج", "Out"), adjustment: t("تعديل", "Adjust"), return: t("إرجاع", "Return"), transfer: t("تحويل", "Transfer") };
  const typeColors: Record<string, string> = { in: "default", out: "destructive", adjustment: "secondary", return: "default", transfer: "outline" };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("حركات المخزون", "Stock Movements")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("تتبع الإدخال والإخراج والتعديلات", "Track stock in/out/adjustments")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#5B21B6" }}><Plus className="h-4 w-4 me-1" />{t("حركة جديدة", "New Movement")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("تسجيل حركة", "Record Movement")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{t("المنتج", "Product")}</Label>
                <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("اختر منتج", "Select product")} /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name_ar || p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("نوع الحركة", "Movement Type")}</Label>
                <Select value={form.movement_type} onValueChange={v => setForm(f => ({ ...f, movement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{t("إدخال", "In")}</SelectItem>
                    <SelectItem value="out">{t("إخراج", "Out")}</SelectItem>
                    <SelectItem value="adjustment">{t("تعديل", "Adjustment")}</SelectItem>
                    <SelectItem value="return">{t("إرجاع", "Return")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t("الكمية", "Quantity")}</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><Label>{t("السبب", "Reason")}</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.product_id || !form.quantity} style={{ background: "#5B21B6" }}>
                {t("تسجيل", "Record")}
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
                <TableHead>{t("المنتج", "Product")}</TableHead>
                <TableHead>{t("النوع", "Type")}</TableHead>
                <TableHead>{t("الكمية", "Qty")}</TableHead>
                <TableHead>{t("السبب", "Reason")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements?.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.takzeen_products?.name_ar || m.takzeen_products?.name || "—"}</TableCell>
                  <TableCell><Badge variant={typeColors[m.movement_type] as any || "secondary"}>{typeLabels[m.movement_type] || m.movement_type}</Badge></TableCell>
                  <TableCell className="font-medium">{Number(m.quantity)}</TableCell>
                  <TableCell>{m.reason || "—"}</TableCell>
                  <TableCell>{new Date(m.movement_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!movements?.length && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("لا توجد حركات", "No movements")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
