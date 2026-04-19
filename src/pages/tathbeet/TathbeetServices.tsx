import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scissors, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TathbeetServices() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [form, setForm] = useState({ name: "", name_en: "", duration_minutes: "30", price: "0", category_id: "" });
  const [catForm, setCatForm] = useState({ name: "", name_en: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["tathbeet-categories", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_service_categories").select("*").eq("company_id", companyId!).order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["tathbeet-services", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_services").select("*, tathbeet_service_categories(name, name_en)").eq("company_id", companyId!).order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addService = useMutation({
    mutationFn: async () => {
      await supabase.from("tathbeet_services").insert({
        company_id: companyId!,
        name: form.name,
        name_en: form.name_en || null,
        duration_minutes: parseInt(form.duration_minutes) || 30,
        price: parseFloat(form.price) || 0,
        category_id: form.category_id || null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-services"] }); setOpen(false); setForm({ name: "", name_en: "", duration_minutes: "30", price: "0", category_id: "" }); toast.success(t("تمت الإضافة", "Added")); },
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      await supabase.from("tathbeet_service_categories").insert({ company_id: companyId!, name: catForm.name, name_en: catForm.name_en || null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-categories"] }); setCatOpen(false); setCatForm({ name: "", name_en: "" }); toast.success(t("تمت الإضافة", "Added")); },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tathbeet_services").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-services"] }); toast.success(t("تم الحذف", "Deleted")); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-extrabold text-2xl">{t("الخدمات", "Services")}</h1>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 me-1" />{t("تصنيف جديد", "New Category")}</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>{t("إضافة تصنيف", "Add Category")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t("الاسم (عربي)", "Name (Arabic)")}</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
                <div><Label>{t("الاسم (إنجليزي)", "Name (English)")}</Label><Input value={catForm.name_en} onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })} /></div>
                <Button onClick={() => addCategory.mutate()} disabled={!catForm.name}>{t("حفظ", "Save")}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />{t("خدمة جديدة", "New Service")}</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>{t("إضافة خدمة", "Add Service")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t("الاسم (عربي)", "Name (Arabic)")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>{t("الاسم (إنجليزي)", "Name (English)")}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
                <div><Label>{t("التصنيف", "Category")}</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("اختر تصنيف", "Select category")} /></SelectTrigger>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name : (c.name_en || c.name)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("المدة (دقيقة)", "Duration (min)")}</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
                  <div><Label>{t("السعر", "Price")}</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                </div>
                <Button onClick={() => addService.mutate()} disabled={!form.name}>{t("حفظ", "Save")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {services.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Scissors className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد خدمات بعد", "No services yet")}</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s: any) => (
            <Card key={s.id} className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-bold text-sm">{lang === "ar" ? s.name : (s.name_en || s.name)}</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteService.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {s.tathbeet_service_categories && <Badge variant="outline" className="text-xs">{lang === "ar" ? s.tathbeet_service_categories.name : (s.tathbeet_service_categories.name_en || s.tathbeet_service_categories.name)}</Badge>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{s.duration_minutes} {t("دقيقة", "min")}</span>
                  <span>{new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(s.price)} {s.currency}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
