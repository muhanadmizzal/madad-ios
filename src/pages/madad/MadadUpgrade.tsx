import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useMadadSubscription } from "@/hooks/useMadadSubscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";
import {
  Zap, CheckCircle2, Layers, ArrowRight, ChevronLeft, ChevronRight,
  FileText, CreditCard, Banknote, Smartphone, Send, Clock,
  Search, Filter, Package, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

type Step = "select" | "invoice" | "payment" | "done";

const CATEGORY_MAP: Record<string, { ar: string; en: string }> = {
  core: { ar: "أساسي", en: "Core" },
  hr: { ar: "موارد بشرية", en: "HR" },
  ai: { ar: "ذكاء اصطناعي", en: "AI" },
  analytics: { ar: "تحليلات وتقارير", en: "Analytics" },
  admin: { ar: "إدارة متقدمة", en: "Admin" },
  addon: { ar: "إضافات", en: "Add-ons" },
  employee: { ar: "خدمة ذاتية", en: "Self-service" },
  financial: { ar: "مالية", en: "Financial" },
  operations: { ar: "تشغيلية", en: "Operations" },
  advanced: { ar: "متقدمة", en: "Advanced" },
};

export default function MadadUpgrade() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleFilter = searchParams.get("module") || "";
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { subscription } = useMadadSubscription();

  const [step, setStep] = useState<Step>("select");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Track toggled features: key → boolean (true = user wants it on, false = wants off)
  const [featureChanges, setFeatureChanges] = useState<Record<string, boolean>>({});

  // All catalog features
  const { data: allFeatures = [] } = useQuery({
    queryKey: ["all-catalog-features"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_catalog")
        .select("*")
        .eq("is_active", true)
        .order("sort_order" as any);
      return data || [];
    },
  });

  // Already activated features for this tenant
  const { data: activeFeatureKeys = [] } = useQuery({
    queryKey: ["my-active-features", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("tenant_features")
        .select("feature_key")
        .eq("company_id", companyId)
        .eq("status", "active");
      return (data || []).map((d: any) => d.feature_key as string);
    },
    enabled: !!companyId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods-enabled"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_methods").select("*").eq("is_enabled", true).order("sort_order");
      return data || [];
    },
  });

  const activeSet = useMemo(() => new Set(activeFeatureKeys), [activeFeatureKeys]);

  // Determine effective state of each feature after user changes
  const getEffectiveState = (key: string): boolean => {
    if (key in featureChanges) return featureChanges[key];
    return activeSet.has(key);
  };

  const toggleFeature = (key: string) => {
    const currentlyActive = activeSet.has(key);
    const currentChange = featureChanges[key];

    if (currentChange === undefined) {
      // First toggle: flip from current state
      setFeatureChanges((p) => ({ ...p, [key]: !currentlyActive }));
    } else if (currentChange === !currentlyActive) {
      // Second toggle: back to original — remove from changes
      setFeatureChanges((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    } else {
      setFeatureChanges((p) => ({ ...p, [key]: !currentChange }));
    }
  };

  // Categories from data
  const categories = useMemo(() => {
    const cats = [...new Set(allFeatures.map((f: any) => f.category))];
    return cats;
  }, [allFeatures]);

  // Filtered features
  const filteredFeatures = useMemo(() => {
    let list = allFeatures;
    if (moduleFilter) {
      list = list.filter((f: any) => f.module_key === moduleFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((f: any) => f.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f: any) =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.name_ar || "").includes(q) ||
        (f.key || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allFeatures, moduleFilter, categoryFilter, searchQuery]);

  // Calculate pricing changes
  const hasChanges = Object.keys(featureChanges).length > 0;

  const previousPrice = useMemo(() => {
    return allFeatures
      .filter((f: any) => activeSet.has(f.key))
      .reduce((sum: number, f: any) => sum + (f.monthly_price || 0), 0);
  }, [allFeatures, activeSet]);

  const newPrice = useMemo(() => {
    return allFeatures
      .filter((f: any) => getEffectiveState(f.key))
      .reduce((sum: number, f: any) => sum + (f.monthly_price || 0), 0);
  }, [allFeatures, featureChanges, activeSet]);

  const priceDiff = newPrice - previousPrice;

  // Features being added/removed
  const addedFeatures = useMemo(() =>
    Object.entries(featureChanges).filter(([k, v]) => v && !activeSet.has(k)).map(([k]) => k),
    [featureChanges, activeSet]
  );
  const removedFeatures = useMemo(() =>
    Object.entries(featureChanges).filter(([k, v]) => !v && activeSet.has(k)).map(([k]) => k),
    [featureChanges, activeSet]
  );

  const displayTotal = billingCycle === "yearly" ? newPrice * 10 : newPrice;
  const displayPrevTotal = billingCycle === "yearly" ? previousPrice * 10 : previousPrice;

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("Missing");
      // Create activation request
      const { error } = await supabase.from("activation_requests").insert({
        company_id: companyId,
        requested_by: user.id,
        request_type: removedFeatures.length > 0 && addedFeatures.length === 0 ? "downgrade" : "upgrade",
        module_keys: moduleFilter ? [moduleFilter] : [],
        feature_keys: addedFeatures,
        billing_cycle: billingCycle,
        subtotal: displayTotal,
        total: displayTotal,
        currency: "USD",
        payment_method_key: paymentMethod,
        payment_reference: paymentRef || null,
      } as any);
      if (error) throw error;

      // Also create individual feature_change_requests for each change
      const changeRequests = [
        ...addedFeatures.map((key) => {
          const feat = allFeatures.find((f: any) => f.key === key);
          return {
            company_id: companyId,
            requested_by: user.id,
            action: "enable",
            request_type: "enable",
            feature_key: key,
            module_key: feat?.module_key || moduleFilter || null,
            estimated_monthly_impact: feat?.monthly_price || 0,
            pricing_impact: feat?.monthly_price || 0,
            current_feature_status: "inactive",
          };
        }),
        ...removedFeatures.map((key) => {
          const feat = allFeatures.find((f: any) => f.key === key);
          return {
            company_id: companyId,
            requested_by: user.id,
            action: "disable",
            request_type: "disable",
            feature_key: key,
            module_key: feat?.module_key || moduleFilter || null,
            estimated_monthly_impact: -(feat?.monthly_price || 0),
            pricing_impact: -(feat?.monthly_price || 0),
            current_feature_status: "active",
          };
        }),
      ];

      if (changeRequests.length > 0) {
        await supabase.from("feature_change_requests").insert(changeRequests as any);
      }
    },
    onSuccess: () => {
      toast.success(t("تم إرسال طلب الترقية!", "Upgrade request submitted!"));
      setStep("done");
      qc.invalidateQueries({ queryKey: ["activation-requests"] });
      qc.invalidateQueries({ queryKey: ["unified-feature-requests"] });
    },
    onError: () => toast.error(t("حدث خطأ", "Error")),
  });

  const METHOD_ICONS: Record<string, React.ReactNode> = {
    cash: <Banknote className="h-5 w-5" />,
    zain_cash: <Smartphone className="h-5 w-5" />,
    bank_card: <CreditCard className="h-5 w-5" />,
  };

  const steps = [
    { key: "select" as Step, label: t("الاختيار", "Select") },
    { key: "invoice" as Step, label: t("الفاتورة", "Invoice") },
    { key: "payment" as Step, label: t("الدفع", "Payment") },
    { key: "done" as Step, label: t("تم", "Done") },
  ];
  const idx = steps.findIndex((s) => s.key === step);

  const modInfo = moduleFilter ? MODULE_REGISTRY[moduleFilter] : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          {lang === "ar" ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="font-heading font-extrabold text-xl flex items-center gap-2">
            <ToggleRight className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
            {t("ترقية الاشتراك", "Upgrade Subscription")}
          </h1>
          {modInfo && (
            <p className="text-sm text-muted-foreground mt-0.5">{t(modInfo.nameAr, modInfo.nameEn)}</p>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Features */}
      {step === "select" && (
        <div className="space-y-4">
          {/* Search + Filter bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("بحث عن ميزة...", "Search features...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            <Button variant={categoryFilter === "all" ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setCategoryFilter("all")}>
              <Filter className="h-3 w-3 me-1" /> {t("الكل", "All")} ({allFeatures.length})
            </Button>
            {categories.map((cat) => {
              const info = CATEGORY_MAP[cat] || { ar: cat, en: cat };
              const count = allFeatures.filter((f: any) => f.category === cat).length;
              return (
                <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setCategoryFilter(cat)}>
                  {t(info.ar, info.en)} ({count})
                </Button>
              );
            })}
          </div>

          {/* Features list */}
          <Card className="border-border/50">
            <CardContent className="p-0 divide-y divide-border/30">
              {filteredFeatures.map((f: any) => {
                const isActive = activeSet.has(f.key);
                const effective = getEffectiveState(f.key);
                const changed = f.key in featureChanges;
                const catInfo = CATEGORY_MAP[f.category] || { ar: f.category, en: f.category };

                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 p-4 transition-all ${
                      changed ? (effective ? "bg-success/5" : "bg-destructive/5") : ""
                    }`}
                  >
                    <Switch
                      checked={effective}
                      onCheckedChange={() => toggleFeature(f.key)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{t(f.name_ar || f.name, f.name)}</p>
                        {isActive && !changed && (
                          <Badge className="bg-success/10 text-success text-[10px] shrink-0">✅ {t("مفعّلة", "Active")}</Badge>
                        )}
                        {changed && effective && (
                          <Badge className="bg-primary/10 text-primary text-[10px] shrink-0">{t("سيتم التفعيل", "Will activate")}</Badge>
                        )}
                        {changed && !effective && (
                          <Badge className="bg-destructive/10 text-destructive text-[10px] shrink-0">{t("سيتم الإلغاء", "Will deactivate")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] h-4">{t(catInfo.ar, catInfo.en)}</Badge>
                        {f.description && <span className="text-[11px] text-muted-foreground truncate">{f.description}</span>}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      {f.pricing_status === "free" ? (
                        <Badge variant="secondary" className="text-[10px]">{t("مجاني", "Free")}</Badge>
                      ) : (
                        <span className="text-sm font-heading font-bold tabular-nums">${f.monthly_price || 0}<span className="text-[10px] text-muted-foreground">/{t("شهر", "mo")}</span></span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredFeatures.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("لا توجد نتائج", "No results")}</p>
              )}
            </CardContent>
          </Card>

          {/* Billing cycle */}
          <div className="flex items-center gap-2 justify-center">
            <Button variant={billingCycle === "monthly" ? "default" : "outline"} size="sm" onClick={() => setBillingCycle("monthly")}>{t("شهري", "Monthly")}</Button>
            <Button variant={billingCycle === "yearly" ? "default" : "outline"} size="sm" onClick={() => setBillingCycle("yearly")} className="gap-1">
              {t("سنوي", "Yearly")} <Badge variant="secondary" className="text-[10px]">{t("وفّر 20%", "Save 20%")}</Badge>
            </Button>
          </div>

          {/* Pricing summary */}
          <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("السعر السابق", "Previous Price")}</span>
              <span className="font-heading font-bold tabular-nums">${displayPrevTotal.toFixed(2)}<span className="text-xs text-muted-foreground">/{billingCycle === "yearly" ? t("سنة", "yr") : t("شهر", "mo")}</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">{t("السعر الجديد", "New Price")}</span>
              <div className="text-end">
                <span className="font-heading font-extrabold text-2xl tabular-nums">${displayTotal.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground ms-1">/{billingCycle === "yearly" ? t("سنة", "yr") : t("شهر", "mo")}</span>
              </div>
            </div>
            {priceDiff !== 0 && (
              <div className={`flex justify-between text-sm ${priceDiff > 0 ? "text-warning" : "text-success"}`}>
                <span>{t("الفرق", "Difference")}</span>
                <span className="font-heading font-bold">{priceDiff > 0 ? "+" : ""}${(billingCycle === "yearly" ? priceDiff * 10 : priceDiff).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <Button disabled={!hasChanges} onClick={() => setStep("invoice")} className="gap-1.5">
                {t("التالي", "Next")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Invoice */}
      {step === "invoice" && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
              {t("ملخص الفاتورة", "Invoice Summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addedFeatures.length > 0 && (
              <div>
                <p className="text-xs font-medium text-success mb-2">{t("سيتم تفعيلها", "To be activated")}</p>
                {addedFeatures.map((k) => {
                  const f = allFeatures.find((ff: any) => ff.key === k);
                  return f ? (
                    <div key={k} className="flex justify-between py-1.5 border-b border-border/20 last:border-0">
                      <span className="text-sm">+ {t(f.name_ar || f.name, f.name)}</span>
                      <span className="text-sm font-heading font-bold text-success">+${billingCycle === "yearly" ? ((f.monthly_price || 0) * 10).toFixed(2) : (f.monthly_price || 0).toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            {removedFeatures.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-2">{t("سيتم إلغاؤها", "To be deactivated")}</p>
                {removedFeatures.map((k) => {
                  const f = allFeatures.find((ff: any) => ff.key === k);
                  return f ? (
                    <div key={k} className="flex justify-between py-1.5 border-b border-border/20 last:border-0">
                      <span className="text-sm">- {t(f.name_ar || f.name, f.name)}</span>
                      <span className="text-sm font-heading font-bold text-destructive">-${billingCycle === "yearly" ? ((f.monthly_price || 0) * 10).toFixed(2) : (f.monthly_price || 0).toFixed(2)}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t("السعر السابق", "Previous")}</span>
                <span>${displayPrevTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-heading font-extrabold text-lg">
                <span>{t("الإجمالي الجديد", "New Total")}</span>
                <span>${displayTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>{t("رجوع", "Back")}</Button>
              <Button className="flex-1 gap-1.5" onClick={() => setStep("payment")}>{t("التالي", "Next")} <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment */}
      {step === "payment" && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
              {t("طريقة الدفع", "Payment Method")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((pm: any) => (
                <div
                  key={pm.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${paymentMethod === pm.key ? "bg-primary/5 border-primary/40" : "bg-muted/20 border-border/50"}`}
                  onClick={() => setPaymentMethod(pm.key)}
                >
                  <RadioGroupItem value={pm.key} id={`up-${pm.key}`} />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
                    {METHOD_ICONS[pm.key] || <CreditCard className="h-5 w-5" />}
                  </div>
                  <Label htmlFor={`up-${pm.key}`} className="font-heading font-bold cursor-pointer">{t(pm.name_ar, pm.name_en)}</Label>
                </div>
              ))}
            </RadioGroup>
            {paymentMethod && paymentMethod !== "bank_card" && (
              <div>
                <Label>{t("رقم المرجع (اختياري)", "Reference (optional)")}</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} dir="ltr" />
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <span className="text-sm font-medium">{t("المبلغ", "Amount")}</span>
              <span className="font-heading font-extrabold text-lg">${displayTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("invoice")}>{t("رجوع", "Back")}</Button>
              <Button className="flex-1 gap-1.5" disabled={!paymentMethod || submitRequest.isPending} onClick={() => submitRequest.mutate()}>
                <Send className="h-4 w-4" /> {submitRequest.isPending ? t("جاري الإرسال...", "Submitting...") : t("إرسال الطلب", "Submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-heading font-extrabold text-xl">{t("تم إرسال الطلب!", "Request Submitted!")}</h2>
            <p className="text-muted-foreground">{t("سيتم مراجعة طلبك وتفعيله عند الموافقة", "Will be activated upon approval")}</p>
            <Badge className="bg-warning/10 text-warning">{t("بانتظار المراجعة", "Pending")}</Badge>
            <div className="pt-4">
              <Button onClick={() => navigate("/madad/subscriptions")}>{t("عرض اشتراكاتي", "View Subscriptions")}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
