import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Search, Crown, Clock, CreditCard, Calendar, Shield, Eye, Timer, Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function MadadAdminTenants() {
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-tenants-full"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, name_ar, status, sector, employee_count_range, created_at").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-all-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_tenant_subscriptions").select("*, madad_packages(name_ar, name_en, key, trial_duration_days)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const subMap = new Map<string, any>();
  subscriptions.forEach((s: any) => {
    if (!subMap.has(s.company_id) || s.status === "active" || s.status === "trial") {
      subMap.set(s.company_id, s);
    }
  });

  const filtered = companies.filter((c: any) => {
    const q = search.toLowerCase();
    return !q || (c.name || "").toLowerCase().includes(q) || (c.name_ar || "").toLowerCase().includes(q);
  });

  const statusStyles: Record<string, string> = {
    active: "bg-success/10 text-success",
    trial: "bg-info/10 text-info",
    expired: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive",
  };

  const getTrialCountdown = (sub: any) => {
    if (!sub?.trial_ends_at) return null;
    const end = new Date(sub.trial_ends_at);
    if (end < new Date()) return t("منتهية", "Expired");
    return formatDistanceToNow(end, { addSuffix: true, locale: lang === "ar" ? ar : undefined });
  };

  // Quick action: extend trial
  const extendTrialMut = useMutation({
    mutationFn: async ({ subId, days }: { subId: string; days: number }) => {
      const sub = subscriptions.find((s: any) => s.id === subId);
      if (!sub) throw new Error("Subscription not found");
      const currentEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
      const newEnd = new Date(currentEnd.getTime() + days * 86400000);
      const { error } = await supabase.from("madad_tenant_subscriptions").update({ trial_ends_at: newEnd.toISOString(), status: "trial" }).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-subscriptions"] });
      toast.success(t("تم تمديد التجربة", "Trial extended"));
      setSelectedTenant(null);
    },
  });

  const activateMut = useMutation({
    mutationFn: async ({ subId }: { subId: string }) => {
      const { error } = await supabase.from("madad_tenant_subscriptions").update({ status: "active" }).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-subscriptions"] });
      toast.success(t("تم التفعيل", "Activated"));
      setSelectedTenant(null);
    },
  });

  const suspendMut = useMutation({
    mutationFn: async ({ subId }: { subId: string }) => {
      const { error } = await supabase.from("madad_tenant_subscriptions").update({ status: "suspended" }).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-subscriptions"] });
      toast.success(t("تم الإيقاف", "Suspended"));
      setSelectedTenant(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-heading font-extrabold text-2xl">{t("إدارة العملاء", "Tenant Management")}</h1>
          <p className="text-sm text-muted-foreground">{t("عرض وإدارة جميع الشركات والاشتراكات", "View and manage all companies and subscriptions")}</p>
        </div>
        <Badge variant="secondary">{companies.length} {t("شركة", "tenants")}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t("بحث...", "Search...")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c: any) => {
            const sub = subMap.get(c.id);
            const trialCountdown = getTrialCountdown(sub);

            return (
              <Card key={c.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedTenant(c)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-heading font-bold">{c.name_ar || c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.sector || "—"} • {c.employee_count_range || "—"}
                          {sub && <> • <span className="font-medium">{t(sub.madad_packages?.name_ar, sub.madad_packages?.name_en)}</span></>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub ? (
                        <>
                          <Badge className={statusStyles[sub.status] || "bg-muted text-muted-foreground"}>
                            {sub.status === "trial" && <Timer className="h-3 w-3 mr-1" />}
                            {sub.status}
                          </Badge>
                          {sub.status === "trial" && trialCountdown && (
                            <span className="text-xs text-info font-medium">{trialCountdown}</span>
                          )}
                        </>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">{t("بدون اشتراك", "No Subscription")}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tenant Detail Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedTenant?.name_ar || selectedTenant?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTenant && (() => {
            const sub = subMap.get(selectedTenant.id);
            const trialCountdown = getTrialCountdown(sub);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t("القطاع:", "Sector:")}</span> {selectedTenant.sector || "—"}</div>
                  <div><span className="text-muted-foreground">{t("الحجم:", "Size:")}</span> {selectedTenant.employee_count_range || "—"}</div>
                  <div><span className="text-muted-foreground">{t("الحالة:", "Status:")}</span> {selectedTenant.status}</div>
                  <div><span className="text-muted-foreground">{t("التسجيل:", "Registered:")}</span> {new Date(selectedTenant.created_at).toLocaleDateString()}</div>
                </div>

                <Separator />

                {sub ? (
                  <div className="space-y-3">
                    <h3 className="font-heading font-bold text-sm flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> {t("الاشتراك", "Subscription")}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">{t("الباقة:", "Plan:")}</span> {t(sub.madad_packages?.name_ar, sub.madad_packages?.name_en)}</div>
                      <div><span className="text-muted-foreground">{t("الحالة:", "Status:")}</span> <Badge className={statusStyles[sub.status] || "bg-muted"}>{sub.status}</Badge></div>
                      <div><span className="text-muted-foreground">{t("الدورة:", "Cycle:")}</span> {sub.billing_cycle}</div>
                      {sub.start_date && <div><span className="text-muted-foreground">{t("البدء:", "Start:")}</span> {sub.start_date}</div>}
                      {sub.end_date && <div><span className="text-muted-foreground">{t("الانتهاء:", "End:")}</span> {sub.end_date}</div>}
                      {sub.trial_ends_at && <div><span className="text-muted-foreground">{t("التجربة:", "Trial:")}</span> {trialCountdown}</div>}
                    </div>

                    <Separator />
                    <h3 className="font-heading font-bold text-sm">{t("إجراءات سريعة", "Quick Actions")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(sub.status === "trial" || sub.status === "expired") && (
                        <Button size="sm" variant="outline" onClick={() => extendTrialMut.mutate({ subId: sub.id, days: 7 })}>
                          <Timer className="h-3.5 w-3.5 mr-1" />{t("تمديد 7 أيام", "+7 Days Trial")}
                        </Button>
                      )}
                      {sub.status !== "active" && (
                        <Button size="sm" onClick={() => activateMut.mutate({ subId: sub.id })}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t("تفعيل", "Activate")}
                        </Button>
                      )}
                      {sub.status === "active" && (
                        <Button size="sm" variant="destructive" onClick={() => suspendMut.mutate({ subId: sub.id })}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />{t("إيقاف", "Suspend")}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("لا يوجد اشتراك نشط لهذا العميل", "No active subscription for this tenant")}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
