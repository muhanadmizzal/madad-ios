import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useMadadSubscription } from "@/hooks/useMadadSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard, FileText, Receipt, Crown, ArrowUpRight, CalendarDays, Layers,
  Zap, CheckCircle2, XCircle, Rocket, Star, Gift, Sparkles, TrendingUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";

interface PackageOption {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  badge_ar: string | null;
  badge_en: string | null;
  is_popular: boolean;
  modules: string[];
  features: Array<{ feature_key: string; feature_label_ar: string; feature_label_en: string; value: string }>;
}

export default function MadadBillingPage() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { subscription, isActive, isTrial, packageName, refetch } = useMadadSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Fetch all available packages with modules
  const { data: packages = [] } = useQuery({
    queryKey: ["madad-available-packages"],
    queryFn: async () => {
      const { data: pkgs } = await supabase
        .from("madad_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!pkgs) return [];

      const result: PackageOption[] = [];
      for (const pkg of pkgs) {
        // Get modules for this package
        const { data: pmData } = await supabase
          .from("madad_package_modules")
          .select("madad_modules(key)")
          .eq("package_id", pkg.id);
        const modules = (pmData || []).map((d: any) => d.madad_modules?.key).filter(Boolean);

        // Get features
        const { data: pfData } = await supabase
          .from("madad_package_features")
          .select("feature_key, feature_label_ar, feature_label_en, value")
          .eq("package_id", pkg.id)
          .order("sort_order");

        result.push({
          ...pkg,
          modules,
          features: pfData || [],
        });
      }
      return result;
    },
    staleTime: 120_000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["madad-invoices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("billing_invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Subscribe / upgrade mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedPkg) throw new Error("Missing data");
      const pkg = packages.find((p) => p.id === selectedPkg);
      if (!pkg) throw new Error("Package not found");

      // Deactivate old subscriptions for this company
      await supabase
        .from("madad_tenant_subscriptions")
        .update({ status: "cancelled" })
        .eq("company_id", companyId)
        .eq("status", "active");

      // Create new subscription
      const { error: subErr } = await supabase
        .from("madad_tenant_subscriptions")
        .insert({
          company_id: companyId,
          package_id: pkg.id,
          status: "active",
          billing_cycle: billingCycle,
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + (billingCycle === "yearly" ? 365 : 30) * 86400000).toISOString().split("T")[0],
        });
      if (subErr) throw subErr;

      // Get all modules to know their IDs
      const { data: allModules } = await supabase.from("madad_modules").select("id, key");
      const moduleMap = new Map((allModules || []).map((m: any) => [m.key, m.id]));

      // Activate modules included in package, deactivate others
      for (const [key, modId] of moduleMap) {
        const shouldBeActive = pkg.modules.includes(key) || key === "tamkeen";
        await supabase.from("madad_tenant_modules").upsert({
          company_id: companyId,
          module_id: modId as string,
          is_active: shouldBeActive,
          activated_at: shouldBeActive ? new Date().toISOString() : undefined,
        }, { onConflict: "company_id,module_id" });
      }

      // Sync tenant_features: deactivate all package-sourced, then activate new package features
      await supabase
        .from("tenant_features")
        .update({ status: "inactive", deactivated_at: new Date().toISOString() } as any)
        .eq("company_id", companyId)
        .eq("source", "package");

      // Activate features from the new package
      for (const feat of pkg.features) {
        const existing = await supabase
          .from("tenant_features")
          .select("id")
          .eq("company_id", companyId)
          .eq("feature_key", feat.feature_key)
          .maybeSingle();

        if (existing.data) {
          await supabase.from("tenant_features")
            .update({
              status: "active",
              source: "package",
              activated_at: new Date().toISOString(),
              deactivated_at: null,
            } as any)
            .eq("id", existing.data.id);
        } else {
          await supabase.from("tenant_features").insert({
            company_id: companyId,
            feature_key: feat.feature_key,
            module_key: null,
            status: "active",
            source: "package",
            activated_at: new Date().toISOString(),
          } as any);
        }
      }

      // Also sync tenant_subscriptions for business portal visibility
      const { data: existingTenantSub } = await supabase
        .from("tenant_subscriptions")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "active")
        .maybeSingle();

      // Find matching subscription_plan by key
      const { data: matchingPlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", pkg.name_en)
        .maybeSingle();

      if (matchingPlan) {
        if (existingTenantSub) {
          await supabase.from("tenant_subscriptions")
            .update({
              plan_id: matchingPlan.id,
              billing_cycle: billingCycle,
              custom_monthly_price: pkg.monthly_price,
              custom_yearly_price: pkg.yearly_price,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingTenantSub.id);
        } else {
          await supabase.from("tenant_subscriptions").insert({
            company_id: companyId,
            plan_id: matchingPlan.id,
            status: "active",
            billing_cycle: billingCycle,
            start_date: new Date().toISOString().split("T")[0],
            custom_monthly_price: pkg.monthly_price,
            custom_yearly_price: pkg.yearly_price,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(t("تم تفعيل الاشتراك بنجاح! 🎉", "Subscription activated successfully! 🎉"));
      setUpgradeOpen(false);
      refetch();
      qc.invalidateQueries({ queryKey: ["madad-subscription-details"] });
      qc.invalidateQueries({ queryKey: ["madad-tenant-modules"] });
      qc.invalidateQueries({ queryKey: ["madad-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["tenant-entitlements"] });
    },
    onError: () => toast.error(t("حدث خطأ أثناء التفعيل", "Error activating subscription")),
  });

  const planLabel = packageName ? t(packageName.ar, packageName.en) : t("بدون اشتراك", "No Plan");
  const monthlyPrice = subscription.package?.monthly_price ?? 0;
  const yearlyPrice = subscription.package?.yearly_price ?? 0;
  const currency = subscription.package?.currency ?? "USD";
  const isYearly = subscription.billing_cycle === "yearly";
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;
  const cycleLabel = isYearly ? t("سنوي", "Yearly") : t("شهري", "Monthly");
  const activeModulesCount = subscription.modules.filter((m) => m.is_active).length + 1;
  const currentPkgKey = subscription.package?.key;

  const statusColor = (s: string) => {
    if (s === "paid") return "bg-success/10 text-success";
    if (s === "submitted") return "bg-info/10 text-info";
    if (s === "overdue") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const MODULE_LABELS: Record<string, { ar: string; en: string }> = {
    tamkeen: { ar: "تمكين (الموارد البشرية)", en: "Tamkeen (HR)" },
    tathbeet: { ar: "تثبيت (الحجوزات)", en: "Tathbeet (Bookings)" },
    takzeen: { ar: "تخزين (المخزون)", en: "Takzeen (Inventory)" },
    tahseel: { ar: "تحصيل (المالية)", en: "Tahseel (Finance)" },
  };

  const PLAN_ICONS: Record<string, React.ReactNode> = {
    basic: <Zap className="h-5 w-5" />,
    pro: <Star className="h-5 w-5" />,
    enterprise: <Rocket className="h-5 w-5" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl">{t("الاشتراك والفواتير", "Billing & Subscription")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("إدارة اشتراكك ومراجعة فواتيرك", "Manage your subscription and review invoices")}</p>
        </div>
        <Button
          onClick={() => { setUpgradeOpen(true); setSelectedPkg(""); }}
          className="gap-1.5 shrink-0"
          style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}
        >
          <Zap className="h-4 w-4" />
          {isActive ? t("تغيير الباقة", "Change Plan") : t("اشترك الآن", "Subscribe Now")}
        </Button>
      </div>

      {/* Subscription Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("الباقة الحالية", "Current Plan")}</p>
              <p className="font-heading font-bold text-lg">{planLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("السعر", "Price")}</p>
              <p className="font-heading font-bold text-lg">{displayPrice > 0 ? `${Number(displayPrice).toLocaleString()} ${currency}` : "—"}</p>
              <p className="text-xs text-muted-foreground">{cycleLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("حالة الاشتراك", "Status")}</p>
              <Badge className={isActive ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                {isActive ? (isTrial ? t("تجريبي", "Trial") : t("فعّال", "Active")) : t("غير مشترك", "Inactive")}
              </Badge>
              {subscription.end_date && (
                <p className="text-xs text-muted-foreground mt-0.5">{t("ينتهي:", "Ends:")} {format(new Date(subscription.end_date), "yyyy/MM/dd")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("الوحدات المفعّلة", "Active Modules")}</p>
              <p className="font-heading font-bold text-lg">{activeModulesCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package features */}
      {subscription.features.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg">{t("مزايا الباقة", "Package Features")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {subscription.features.map((f) => (
                <div key={f.feature_key} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                  <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>{t(f.feature_label_ar || f.feature_key, f.feature_label_en || f.feature_key)}</span>
                  {f.value && f.value !== "true" && (
                    <Badge variant="secondary" className="text-xs ms-auto">{f.value}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active modules */}
      {subscription.modules.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg">{t("الوحدات المفعّلة", "Active Modules")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subscription.modules.map((m) => (
                <div key={m.key} className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/30">
                  {m.is_active ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  <span className="font-medium">{t(m.name_ar, m.name_en)}</span>
                  <Badge className={`ms-auto text-xs ${m.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {m.is_active ? t("فعّال", "Active") : t("معطّل", "Inactive")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
            {t("الفواتير", "Invoices")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>{t("لا توجد فواتير بعد", "No invoices yet")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), "yyyy/MM/dd")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-bold text-sm">{Number(inv.amount).toLocaleString()} {inv.currency}</span>
                    <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== ACTIVE OFFERS ====== */}
      <OffersSection />

      {/* ====== SMART SUGGESTIONS ====== */}
      <SuggestionsSection modules={subscription.modules} />

      {/* ====== UPGRADE / SUBSCRIBE DIALOG ====== */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {isActive ? t("تغيير الباقة", "Change Plan") : t("اختر باقتك", "Choose Your Plan")}
            </DialogTitle>
          </DialogHeader>

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-2 justify-center py-2">
            <Button
              variant={billingCycle === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("monthly")}
            >
              {t("شهري", "Monthly")}
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("yearly")}
              className="gap-1"
            >
              {t("سنوي", "Yearly")}
              <Badge variant="secondary" className="text-[10px]">{t("وفّر 20%", "Save 20%")}</Badge>
            </Button>
          </div>

          {/* Package cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              const isCurrent = currentPkgKey === pkg.key;
              const isSelected = selectedPkg === pkg.id;
              const price = billingCycle === "yearly" ? pkg.yearly_price : pkg.monthly_price;
              return (
                <Card
                  key={pkg.id}
                  className={`border-2 cursor-pointer transition-all ${isSelected ? "border-primary shadow-lg" : isCurrent ? "border-success/50" : "border-border/50"} ${isCurrent && !isSelected ? "bg-success/5" : ""}`}
                  onClick={() => setSelectedPkg(pkg.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "hsl(var(--gold))" }}>{PLAN_ICONS[pkg.key] || <Zap className="h-5 w-5" />}</span>
                        <h3 className="font-heading font-bold">{t(pkg.name_ar, pkg.name_en)}</h3>
                      </div>
                      {isCurrent && <Badge className="bg-success/10 text-success text-[10px]">{t("الحالي", "Current")}</Badge>}
                      {pkg.is_popular && !isCurrent && <Badge className="text-[10px]" style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}>{t("الأكثر طلباً", "Popular")}</Badge>}
                    </div>

                    <div>
                      <span className="font-heading font-extrabold text-2xl">{Number(price).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ms-1">{pkg.currency}/{billingCycle === "yearly" ? t("سنة", "yr") : t("شهر", "mo")}</span>
                    </div>

                    {/* Modules included */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{t("الوحدات:", "Modules:")}</p>
                      {["tamkeen", "tathbeet", "takzeen", "tahseel"].map((mk) => {
                        const included = pkg.modules.includes(mk);
                        const ml = MODULE_LABELS[mk];
                        return (
                          <div key={mk} className={`flex items-center gap-1.5 text-xs ${included ? "" : "text-muted-foreground/50 line-through"}`}>
                            {included ? <CheckCircle2 className="h-3 w-3 text-success" /> : <XCircle className="h-3 w-3 text-muted-foreground/30" />}
                            {t(ml.ar, ml.en)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Features */}
                    {pkg.features.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-border/30">
                        {pkg.features.slice(0, 4).map((f) => (
                          <div key={f.feature_key} className="flex items-center gap-1.5 text-xs">
                            <ArrowUpRight className="h-3 w-3 text-success" />
                            {t(f.feature_label_ar || f.feature_key, f.feature_label_en || f.feature_key)}
                          </div>
                        ))}
                        {pkg.features.length > 4 && (
                          <p className="text-[10px] text-muted-foreground">+{pkg.features.length - 4} {t("مزايا أخرى", "more features")}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button
              disabled={!selectedPkg || subscribeMutation.isPending || (currentPkgKey && packages.find(p => p.id === selectedPkg)?.key === currentPkgKey)}
              onClick={() => subscribeMutation.mutate()}
              className="gap-1.5"
              style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}
            >
              {subscribeMutation.isPending ? t("جاري التفعيل...", "Activating...") : t("تفعيل الباقة", "Activate Plan")}
              <Zap className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== OFFERS SECTION ==================== */
function OffersSection() {
  const { t } = useLanguage();
  const { data: offers = [] } = useQuery({
    queryKey: ["madad-active-offers"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("madad_offers")
        .select("*")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    staleTime: 120_000,
  });

  if (offers.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Gift className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
          {t("العروض الحالية", "Current Offers")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm">{t(offer.title_ar, offer.title_en)}</h4>
                  {offer.badge_ar && (
                    <Badge className="text-[10px]" style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}>
                      {t(offer.badge_ar, offer.badge_en || offer.badge_ar)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t(offer.description_ar || "", offer.description_en || "")}</p>
                {offer.discount_value && (
                  <div className="flex items-center gap-1 text-sm font-bold" style={{ color: "hsl(var(--gold))" }}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {offer.discount_type === "percentage" ? `${offer.discount_value}%` : `${offer.discount_value}`} {t("خصم", "off")}
                  </div>
                )}
                {offer.expires_at && (
                  <p className="text-[10px] text-muted-foreground">
                    {t("ينتهي:", "Ends:")} {format(new Date(offer.expires_at), "yyyy/MM/dd")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ==================== SMART SUGGESTIONS ==================== */
function SuggestionsSection({ modules }: { modules: Array<{ key: string; is_active: boolean; name_ar: string; name_en: string }> }) {
  const { t } = useLanguage();

  // Build suggestions based on inactive modules
  const inactiveModules = Object.values(MODULE_REGISTRY).filter(
    (m) => !modules.some((am) => am.key === m.key && am.is_active)
  );

  if (inactiveModules.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
          {t("مقترحات ذكية", "Smart Suggestions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {t("بناءً على نشاطك، ننصحك بتفعيل الوحدات التالية لتحسين إنتاجيتك:", "Based on your activity, we recommend activating these modules:")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inactiveModules.map((mod) => (
            <div key={mod.key} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
              <img src={mod.iconLogo} alt={mod.nameAr} className="h-8 w-8 rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-sm">{t(mod.nameAr, mod.nameEn)}</p>
                <p className="text-xs text-muted-foreground truncate">{t(mod.descAr, mod.descEn)}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => window.location.hash = ""}>
                <Zap className="h-3 w-3" />
                {t("تفعيل", "Activate")}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
