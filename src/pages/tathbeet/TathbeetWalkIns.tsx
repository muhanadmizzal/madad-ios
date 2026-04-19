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
import { Plus, Users, UserPlus, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TathbeetWalkIns() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", service_id: "", notes: "" });

  const { data: walkIns = [] } = useQuery({
    queryKey: ["tathbeet-walkins", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_walk_ins")
        .select("*, tathbeet_services(name, name_en)")
        .eq("company_id", companyId!)
        .in("status", ["waiting", "serving"])
        .order("queue_position");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["tathbeet-services-walkin", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_services").select("id, name, name_en").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addWalkIn = useMutation({
    mutationFn: async () => {
      const maxPos = walkIns.reduce((max: number, w: any) => Math.max(max, w.queue_position || 0), 0);
      await supabase.from("tathbeet_walk_ins").insert({
        company_id: companyId!,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        service_id: form.service_id || null,
        queue_position: maxPos + 1,
        notes: form.notes || null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-walkins"] }); setOpen(false); setForm({ customer_name: "", customer_phone: "", service_id: "", notes: "" }); toast.success(t("تمت الإضافة للطابور", "Added to queue")); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("tathbeet_walk_ins").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-walkins"] }); toast.success(t("تم التحديث", "Updated")); },
  });

  const statusColor: Record<string, string> = {
    waiting: "bg-warning/10 text-warning border-warning/20",
    serving: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
    no_show: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-extrabold text-2xl">{t("الحضور بدون موعد", "Walk-Ins")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 me-1" />{t("إضافة زائر", "Add Walk-In")}</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>{t("زائر جديد", "New Walk-In")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("الاسم", "Name")} *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>{t("الهاتف", "Phone")}</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>{t("الخدمة", "Service")}</Label>
                <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("اختياري", "Optional")} /></SelectTrigger>
                  <SelectContent>{services.map((s: any) => <SelectItem key={s.id} value={s.id}>{lang === "ar" ? s.name : (s.name_en || s.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("ملاحظات", "Notes")}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={() => addWalkIn.mutate()} disabled={!form.customer_name}>{t("إضافة", "Add")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {walkIns.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا يوجد زوار في الطابور", "No walk-ins in queue")}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {walkIns.map((w: any) => (
            <Card key={w.id} className="border-border/50">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                    {w.queue_position}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{w.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.tathbeet_services ? (lang === "ar" ? w.tathbeet_services.name : w.tathbeet_services.name_en || w.tathbeet_services.name) : "—"}
                      {w.customer_phone && ` • ${w.customer_phone}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColor[w.status] || ""}>{w.status === "waiting" ? t("بالانتظار", "Waiting") : t("يُخدَم", "Serving")}</Badge>
                  {w.status === "waiting" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: w.id, status: "serving" })}>{t("بدء الخدمة", "Start")}</Button>
                  )}
                  {w.status === "serving" && (
                    <>
                      <Button size="sm" variant="outline" className="text-success" onClick={() => updateStatus.mutate({ id: w.id, status: "completed" })}><CheckCircle2 className="h-3.5 w-3.5 me-1" />{t("إتمام", "Done")}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus.mutate({ id: w.id, status: "no_show" })}><XCircle className="h-3.5 w-3.5 me-1" />{t("لم يحضر", "No Show")}</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
