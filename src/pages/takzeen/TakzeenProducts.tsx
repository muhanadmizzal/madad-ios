import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function TakzeenProducts() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ sku: "", name: "", name_ar: "", unit: "piece", unit_cost: "", selling_price: "", reorder_level: "10" });

  const { data: products } = useQuery({
    queryKey: ["takzeen-products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_products").select("*").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("takzeen_products").insert({
        company_id: companyId,
        sku: form.sku,
        name: form.name,
        name_ar: form.name_ar || null,
        unit: form.unit,
        unit_cost: parseFloat(form.unit_cost) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        reorder_level: parseFloat(form.reorder_level) || 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["takzeen-products"] });
      toast.success(t("تم إضافة المنتج", "Product added"));
      setOpen(false);
      setForm({ sku: "", name: "", name_ar: "", unit: "piece", unit_cost: "", selling_price: "", reorder_level: "10" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  const filtered = products?.filter(p => !search || p.name.includes(search) || p.sku.includes(search) || p.name_ar?.includes(search)) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("المنتجات", "Products")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("كتالوج المنتجات والأصناف", "Product catalog")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#5B21B6" }}><Plus className="h-4 w-4 me-1" />{t("منتج جديد", "New Product")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إضافة منتج", "Add Product")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="PRD-001" /></div>
              <div><Label>{t("الاسم (EN)", "Name (EN)")}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t("الاسم (AR)", "Name (AR)")}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("سعر التكلفة", "Unit Cost")}</Label><Input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} /></div>
                <div><Label>{t("سعر البيع", "Selling Price")}</Label><Input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} /></div>
              </div>
              <div><Label>{t("حد إعادة الطلب", "Reorder Level")}</Label><Input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.sku || !form.name} style={{ background: "#5B21B6" }}>
                {t("إضافة", "Add")}
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
                <TableHead>SKU</TableHead>
                <TableHead>{t("الاسم", "Name")}</TableHead>
                <TableHead>{t("المخزون", "Stock")}</TableHead>
                <TableHead>{t("التكلفة", "Cost")}</TableHead>
                <TableHead>{t("السعر", "Price")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>{p.name_ar || p.name}</TableCell>
                  <TableCell>
                    <span className={Number(p.current_stock) <= Number(p.reorder_level) ? "text-destructive font-bold" : ""}>
                      {Number(p.current_stock)}
                    </span>
                  </TableCell>
                  <TableCell>{Number(p.unit_cost).toLocaleString()}</TableCell>
                  <TableCell>{Number(p.selling_price).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}</Badge></TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("لا توجد منتجات", "No products")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
