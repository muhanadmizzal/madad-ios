import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";
import {
  CheckCircle2, ChevronLeft, ChevronRight, FileText, CreditCard,
  Banknote, Smartphone, Layers, ArrowRight, Clock, Send,
} from "lucide-react";
import { toast } from "sonner";

type Step = "features" | "invoice" | "payment" | "done";

export default function MadadActivationFlow() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const [searchParams] = useSearchParams();
  const requestType = searchParams.get("type") || "activation";
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("features");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const mod = moduleKey ? MODULE_REGISTRY[moduleKey] : null;

  // Fetch features for this module from feature_catalog
  const { data: features = [] } = useQuery({
    queryKey: ["module-features", moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_catalog")
        .select("*")
        .eq("module_key", moduleKey)
        .eq("is_active", true)
        .order("sort_order" as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleKey,
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods-enabled"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_enabled", true)
        .order("sort_order");
      return data || [];
    },
  });

  const toggleFeature = (key: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedFeatures(features.map((f: any) => f.key));
    } else {
      setSelectedFeatures([]);
    }
  };

  const selectedItems = useMemo(() => {
    return features.filter((f: any) => selectedFeatures.includes(f.key));
  }, [features, selectedFeatures]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum: number, f: any) => {
      return sum + (billingCycle === "yearly" ? (f.monthly_price || 0) * 10 : (f.monthly_price || 0));
    }, 0);
  }, [selectedItems, billingCycle]);

  const total = subtotal; // discount can be added later

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("activation_requests").insert({
        company_id: companyId,
        requested_by: user.id,
        request_type: requestType,
        module_keys: moduleKey ? [moduleKey] : [],
        feature_keys: selectedFeatures,
        billing_cycle: billingCycle,
        subtotal,
        total,
        currency: "USD",
        payment_method_key: paymentMethod,
        payment_reference: paymentRef || null,
      } as any);
      if (error) throw error;

      // Create individual feature_change_requests for each selected feature
      const changeRequests = selectedFeatures.map((key) => {
        const feat = features.find((f: any) => f.key === key);
        return {
          company_id: companyId,
          requested_by: user.id,
          action: "enable",
          request_type: "enable",
          feature_key: key,
          module_key: feat?.module_key || moduleKey || null,
          estimated_monthly_impact: feat?.monthly_price || 0,
          pricing_impact: feat?.monthly_price || 0,
          current_feature_status: "inactive",
        };
      });

      if (changeRequests.length > 0) {
        await supabase.from("feature_change_requests").insert(changeRequests as any);
      }
    },
    onSuccess: () => {
      toast.success(t("تم إرسال طلب التفعيل بنجاح! سيتم مراجعته من الإدارة", "Activation request submitted! It will be reviewed by admin."));
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

  const steps: { key: Step; label: string }[] = [
    { key: "features", label: t("اختيار المزايا", "Select Features") },
    { key: "invoice", label: t("الفاتورة", "Invoice") },
    { key: "payment", label: t("الدفع", "Payment") },
    { key: "done", label: t("تم", "Done") },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          {lang === "ar" ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        <div>
          <h1 className="font-heading font-extrabold text-xl">
            {requestType === "upgrade" ? t("ترقية الاشتراك", "Upgrade") : t("تفعيل الوحدة", "Activate Module")}
            {mod && <span className="text-muted-foreground ms-2">— {t(mod.nameAr, mod.nameEn)}</span>}
          </h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i <= currentStepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < currentStepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 1: Features */}
      {step === "features" && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" style={{ color: mod ? `hsl(${mod.color})` : undefined }} />
              {t("اختر المزايا", "Select Features")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Select all */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox
                checked={selectAll}
                onCheckedChange={(v) => handleSelectAll(!!v)}
                id="select-all"
              />
              <Label htmlFor="select-all" className="font-heading font-bold cursor-pointer">
                {t("تحديد الكل (الوحدة كاملة)", "Select All (Full Module)")}
              </Label>
            </div>

            {/* Feature list */}
            <div className="space-y-2">
              {features.map((f: any) => (
                <div
                  key={f.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedFeatures.includes(f.key) ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border/50"
                  }`}
                  onClick={() => toggleFeature(f.key)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedFeatures.includes(f.key)} />
                    <div>
                      <p className="text-sm font-medium">{t(f.name_ar || f.name, f.name)}</p>
                      {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                    </div>
                  </div>
                  <div className="text-end">
                    {f.pricing_status === "free" ? (
                      <Badge variant="secondary">{t("مجاني", "Free")}</Badge>
                    ) : (
                      <span className="text-sm font-heading font-bold">${f.monthly_price || 0}<span className="text-xs text-muted-foreground">/{t("شهر", "mo")}</span></span>
                    )}
                  </div>
                </div>
              ))}
              {features.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("لا توجد مزايا متاحة", "No features available")}</p>
              )}
            </div>

            {/* Billing cycle */}
            <div className="flex items-center gap-2 justify-center pt-2">
              <Button variant={billingCycle === "monthly" ? "default" : "outline"} size="sm" onClick={() => setBillingCycle("monthly")}>
                {t("شهري", "Monthly")}
              </Button>
              <Button variant={billingCycle === "yearly" ? "default" : "outline"} size="sm" onClick={() => setBillingCycle("yearly")} className="gap-1">
                {t("سنوي", "Yearly")}
                <Badge variant="secondary" className="text-[10px]">{t("وفّر 20%", "Save 20%")}</Badge>
              </Button>
            </div>

            {/* Total + Next */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">{t("الإجمالي", "Total")}</p>
                <p className="font-heading font-extrabold text-2xl">${total.toFixed(2)}<span className="text-sm text-muted-foreground">/{billingCycle === "yearly" ? t("سنة", "yr") : t("شهر", "mo")}</span></p>
              </div>
              <Button disabled={selectedFeatures.length === 0} onClick={() => setStep("invoice")} className="gap-1.5">
                {t("التالي", "Next")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
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
            {mod && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <img src={mod.iconLogo} alt={mod.nameEn} className="h-8 w-8" />
                <div>
                  <p className="font-heading font-bold">{t(mod.nameAr, mod.nameEn)}</p>
                  <p className="text-xs text-muted-foreground">{t(mod.descAr, mod.descEn)}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {selectedItems.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm">{t(f.name_ar || f.name, f.name)}</span>
                  <span className="text-sm font-heading font-bold">
                    {f.pricing_status === "free" ? t("مجاني", "Free") : `$${billingCycle === "yearly" ? ((f.monthly_price || 0) * 10).toFixed(2) : (f.monthly_price || 0).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("الفترة", "Period")}</span>
                <span>{billingCycle === "yearly" ? t("سنوي", "Yearly") : t("شهري", "Monthly")}</span>
              </div>
              <div className="flex justify-between font-heading font-extrabold text-lg">
                <span>{t("الإجمالي", "Total")}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("features")} className="gap-1.5">
                {lang === "ar" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {t("رجوع", "Back")}
              </Button>
              <Button className="flex-1 gap-1.5" onClick={() => setStep("payment")}>
                {t("التالي — اختيار طريقة الدفع", "Next — Choose Payment")} <ArrowRight className="h-4 w-4" />
              </Button>
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
              {t("اختيار طريقة الدفع", "Select Payment Method")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((pm: any) => (
                <div
                  key={pm.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    paymentMethod === pm.key ? "bg-primary/5 border-primary/40" : "bg-muted/20 border-border/50"
                  }`}
                  onClick={() => setPaymentMethod(pm.key)}
                >
                  <RadioGroupItem value={pm.key} id={pm.key} />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
                    {METHOD_ICONS[pm.key] || <CreditCard className="h-5 w-5" />}
                  </div>
                  <div>
                    <Label htmlFor={pm.key} className="font-heading font-bold cursor-pointer">{t(pm.name_ar, pm.name_en)}</Label>
                    {pm.config?.instructions && <p className="text-xs text-muted-foreground mt-0.5">{pm.config.instructions}</p>}
                    {pm.key === "zain_cash" && pm.config?.phone && <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{pm.config.phone}</p>}
                  </div>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("لا توجد طرق دفع مفعّلة", "No payment methods enabled")}</p>
              )}
            </RadioGroup>

            {paymentMethod && paymentMethod !== "bank_card" && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label>{t("رقم المرجع (اختياري)", "Reference Number (optional)")}</Label>
                  <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={t("رقم عملية التحويل", "Transfer transaction number")} dir="ltr" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <span className="text-sm font-medium">{t("المبلغ المطلوب", "Amount Due")}</span>
              <span className="font-heading font-extrabold text-lg">${total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("invoice")} className="gap-1.5">
                {lang === "ar" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {t("رجوع", "Back")}
              </Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={!paymentMethod || submitRequest.isPending}
                onClick={() => submitRequest.mutate()}
              >
                <Send className="h-4 w-4" />
                {submitRequest.isPending ? t("جاري الإرسال...", "Submitting...") : t("إرسال طلب التفعيل", "Submit Activation Request")}
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
            <h2 className="font-heading font-extrabold text-xl">{t("تم إرسال الطلب بنجاح!", "Request Submitted!")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("سيتم مراجعة طلبك من قبل إدارة المنصة وتفعيل الاشتراك عند الموافقة", "Your request will be reviewed by platform admin and activated upon approval")}
            </p>
            <Badge className="bg-warning/10 text-warning border-warning/20">{t("بانتظار المراجعة", "Pending Review")}</Badge>
            <div className="pt-4">
              <Button onClick={() => navigate("/madad/subscriptions")} className="gap-1.5">
                {t("عرض اشتراكاتي", "View My Subscriptions")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
