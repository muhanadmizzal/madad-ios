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
import { Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";

export default function TakzeenWarehouses() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", name_ar: "", address: "", city: "", manager_name: "", phone: "" });

  const { data: warehouses } = useQuery({
    queryKey: ["takzeen-warehouses", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_warehouses").select("*").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("takzeen_warehouses").insert({
        company_id: companyId,
        name: form.name,
        name_ar: form.name_ar || null,
        address: form.address || null,
        city: form.city || null,
        manager_name: form.manager_name || null,
        phone: form.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["takzeen-warehouses"] });
      toast.success(t("تم إنشاء المستودع", "Warehouse created"));
      setOpen(false);
      setForm({ name: "", name_ar: "", address: "", city: "", manager_name: "", phone: "" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("المستودعات", "Warehouses")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("إدارة مواقع التخزين", "Manage storage locations")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#5B21B6" }}><Plus className="h-4 w-4 me-1" />{t("مستودع جديد", "New Warehouse")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إنشاء مستودع", "Create Warehouse")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("الاسم (EN)", "Name (EN)")}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t("الاسم (AR)", "Name (AR)")}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
              <div><Label>{t("العنوان", "Address")}</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><Label>{t("المدينة", "City")}</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>{t("المسؤول", "Manager")}</Label><Input value={form.manager_name} onChange={e => setForm(f => ({ ...f, manager_name: e.target.value }))} /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.name} style={{ background: "#5B21B6" }}>
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
                <TableHead>{t("الاسم", "Name")}</TableHead>
                <TableHead>{t("المدينة", "City")}</TableHead>
                <TableHead>{t("المسؤول", "Manager")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses?.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name_ar || w.name}</TableCell>
                  <TableCell>{w.city || "—"}</TableCell>
                  <TableCell>{w.manager_name || "—"}</TableCell>
                  <TableCell><Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}</Badge></TableCell>
                </TableRow>
              ))}
              {!warehouses?.length && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("لا توجد مستودعات", "No warehouses")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
