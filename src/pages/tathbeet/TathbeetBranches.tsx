import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TathbeetBranches() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", name_en: "", location: "", address: "", phone: "" });

  const { data: branches = [] } = useQuery({
    queryKey: ["tathbeet-branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_branches").select("*").eq("company_id", companyId!).order("created_at");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addBranch = useMutation({
    mutationFn: async () => {
      await supabase.from("tathbeet_branches").insert({ company_id: companyId!, ...form, name_en: form.name_en || null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-branches"] }); setOpen(false); setForm({ name: "", name_en: "", location: "", address: "", phone: "" }); toast.success(t("تمت الإضافة", "Added")); },
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tathbeet_branches").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-branches"] }); toast.success(t("تم الحذف", "Deleted")); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-extrabold text-2xl">{t("الفروع", "Branches")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />{t("فرع جديد", "New Branch")}</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{t("إضافة فرع", "Add Branch")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("الاسم (عربي)", "Name (Arabic)")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t("الاسم (إنجليزي)", "Name (English)")}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
              <div><Label>{t("الموقع", "Location")}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>{t("العنوان", "Address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <Button onClick={() => addBranch.mutate()} disabled={!form.name}>{t("حفظ", "Save")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {branches.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد فروع بعد", "No branches yet")}</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b: any) => (
            <Card key={b.id} className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-bold text-sm">{lang === "ar" ? b.name : (b.name_en || b.name)}</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBranch.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {b.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{b.location}</p>}
                {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
                <Badge className={b.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>{b.status === "active" ? t("نشط", "Active") : t("معطّل", "Inactive")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
