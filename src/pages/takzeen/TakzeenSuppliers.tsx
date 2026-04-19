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
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";

export default function TakzeenSuppliers() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", name_ar: "", contact_person: "", phone: "", email: "", city: "" });

  const { data: suppliers } = useQuery({
    queryKey: ["takzeen-suppliers", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_suppliers").select("*").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("takzeen_suppliers").insert({
        company_id: companyId,
        name: form.name,
        name_ar: form.name_ar || null,
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["takzeen-suppliers"] });
      toast.success(t("تم إضافة المورد", "Supplier added"));
      setOpen(false);
      setForm({ name: "", name_ar: "", contact_person: "", phone: "", email: "", city: "" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("الموردون", "Suppliers")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("إدارة الموردين والبائعين", "Manage suppliers and vendors")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#5B21B6" }}><Plus className="h-4 w-4 me-1" />{t("مورد جديد", "New Supplier")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إضافة مورد", "Add Supplier")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("الاسم (EN)", "Name (EN)")}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t("الاسم (AR)", "Name (AR)")}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
              <div><Label>{t("جهة الاتصال", "Contact Person")}</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>{t("البريد", "Email")}</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>{t("المدينة", "City")}</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.name} style={{ background: "#5B21B6" }}>
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
                <TableHead>{t("الاسم", "Name")}</TableHead>
                <TableHead>{t("جهة الاتصال", "Contact")}</TableHead>
                <TableHead>{t("الهاتف", "Phone")}</TableHead>
                <TableHead>{t("المدينة", "City")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name_ar || s.name}</TableCell>
                  <TableCell>{s.contact_person || "—"}</TableCell>
                  <TableCell dir="ltr">{s.phone || "—"}</TableCell>
                  <TableCell>{s.city || "—"}</TableCell>
                  <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}</Badge></TableCell>
                </TableRow>
              ))}
              {!suppliers?.length && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("لا توجد موردون", "No suppliers")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
