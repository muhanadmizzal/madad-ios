import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useMadadSubscription } from "@/hooks/useMadadSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";
import {
  Layers, CheckCircle2, XCircle, ArrowUpRight, Zap, Gift, Sparkles, Star,
  Crown, Rocket, TrendingUp, Clock,
} from "lucide-react";
import { HybridAccessSummaryCard } from "@/components/madad/HybridAccessSummaryCard";

export default function MadadSubscriptions() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { subscription, isActive } = useMadadSubscription();

  // Active modules
  const activeModules = subscription.modules.filter((m) => m.is_active);
  const inactiveModules = Object.values(MODULE_REGISTRY).filter(
    (m) => !activeModules.some((am) => am.key === m.key)
  );

  // Pending activation requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["my-activation-requests", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("activation_requests")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Offers
  const { data: offers = [] } = useQuery({
    queryKey: ["madad-active-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("madad_offers")
        .select("*")
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("sort_order");
      return data || [];
    },
  });

  // Packages
  const { data: packages = [] } = useQuery({
    queryKey: ["madad-packages-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("madad_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const statusColor = (s: string) => {
    if (s === "approved" || s === "active") return "bg-success/10 text-success";
    if (s === "pending") return "bg-warning/10 text-warning";
    if (s === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl">{t("الاشتراكات", "Subscriptions")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("إدارة اشتراكاتك والوحدات المفعّلة", "Manage your subscriptions and active modules")}</p>
        </div>
        <Button onClick={() => navigate("/madad/upgrade")} className="gap-1.5 shrink-0" style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}>
          <Zap className="h-4 w-4" /> {t("ترقية", "Upgrade")}
        </Button>
      </div>

      {/* Active Subscriptions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            {t("الاشتراكات الفعّالة", "Active Subscriptions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeModules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("لا توجد وحدات مفعّلة", "No active modules")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeModules.map((m) => {
                const reg = MODULE_REGISTRY[m.key];
                return (
                  <div key={m.key} className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                    {reg && <img src={reg.iconLogo} alt={m.name_en} className="h-10 w-10" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm">{t(m.name_ar, m.name_en)}</p>
                      <Badge className="bg-success/10 text-success text-[10px] mt-1">{t("فعّال", "Active")}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/madad/activate/${m.key}?type=upgrade`)} className="gap-1 shrink-0">
                      <ArrowUpRight className="h-3.5 w-3.5" /> {t("ترقية", "Upgrade")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hybrid Access — platform-wide */}
      <HybridAccessSummaryCard variant="full" />

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              {t("الطلبات", "Requests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{r.module_keys?.join(", ") || t("عام", "General")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading font-bold">${r.total}</span>
                    <Badge className={statusColor(r.status)}>{r.status === "pending" ? t("بانتظار المراجعة", "Pending") : r.status === "approved" ? t("تمت الموافقة", "Approved") : t("مرفوض", "Rejected")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions — Inactive modules */}
      {inactiveModules.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
              {t("المقترحات", "Suggestions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inactiveModules.map((m) => (
                <div key={m.key} className="flex items-center gap-3 p-4 rounded-lg bg-muted/20 border border-border/50">
                  <img src={m.iconLogo} alt={m.nameEn} className="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">{t(m.nameAr, m.nameEn)}</p>
                    <p className="text-xs text-muted-foreground">{t(m.descAr, m.descEn)}</p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/madad/activate/${m.key}`)} className="gap-1 shrink-0">
                    <Zap className="h-3.5 w-3.5" /> {t("تفعيل", "Activate")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-destructive" />
              {t("العروض", "Offers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map((o: any) => (
                <div key={o.id} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                  <p className="font-heading font-bold">{t(o.title_ar || o.title, o.title)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
                  {o.discount_percent && <Badge className="bg-destructive/10 text-destructive mt-2">-{o.discount_percent}%</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packages */}
      {packages.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Crown className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
              {t("الباقات", "Packages")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packages.map((p: any) => (
                <div key={p.id} className={`p-4 rounded-lg border ${p.is_popular ? "border-primary/40 bg-primary/5" : "border-border/50 bg-muted/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-heading font-bold">{t(p.name_ar, p.name_en)}</p>
                    {p.is_popular && <Badge className="bg-primary/10 text-primary text-[10px]">{t("الأكثر شيوعاً", "Popular")}</Badge>}
                  </div>
                  <p className="font-heading font-extrabold text-xl">${p.monthly_price}<span className="text-xs text-muted-foreground">/{t("شهر", "mo")}</span></p>
                  <Button size="sm" className="w-full mt-3 gap-1" onClick={() => navigate("/madad/billing")}>
                    {t("اشتراك", "Subscribe")}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
