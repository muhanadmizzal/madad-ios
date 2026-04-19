import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Banknote, Smartphone, CreditCard, Save, Settings } from "lucide-react";
import { toast } from "sonner";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-5 w-5" />,
  zain_cash: <Smartphone className="h-5 w-5" />,
  bank_card: <CreditCard className="h-5 w-5" />,
};

export default function MadadPaymentMethods() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, any>>({});

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const updateMethod = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success(t("تم الحفظ", "Saved"));
    },
    onError: () => toast.error(t("حدث خطأ", "Error")),
  });

  const getEdit = (id: string) => edits[id] || {};
  const setEdit = (id: string, field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const handleToggle = (m: any, enabled: boolean) => {
    updateMethod.mutate({ id: m.id, updates: { is_enabled: enabled } });
  };

  const handleSaveConfig = (m: any) => {
    const edit = getEdit(m.id);
    const newConfig = { ...m.config, ...edit };
    updateMethod.mutate({ id: m.id, updates: { config: newConfig } });
    setEdits((prev) => {
      const next = { ...prev };
      delete next[m.id];
      return next;
    });
  };

  const renderConfigFields = (m: any) => {
    const config = { ...m.config, ...getEdit(m.id) };
    switch (m.key) {
      case "cash":
        return (
          <div className="space-y-3">
            <div>
              <Label>{t("تعليمات الدفع النقدي", "Cash Payment Instructions")}</Label>
              <Textarea
                value={config.instructions || ""}
                onChange={(e) => setEdit(m.id, "instructions", e.target.value)}
                placeholder={t("مثال: يرجى تسليم المبلغ في مكتب المالية", "e.g. Please deliver amount to finance office")}
                rows={3}
              />
            </div>
          </div>
        );
      case "zain_cash":
        return (
          <div className="space-y-3">
            <div>
              <Label>{t("رقم الهاتف", "Phone Number")}</Label>
              <Input
                value={config.phone || ""}
                onChange={(e) => setEdit(m.id, "phone", e.target.value)}
                placeholder="07XX XXX XXXX"
                dir="ltr"
              />
            </div>
            <div>
              <Label>{t("تعليمات الدفع", "Payment Instructions")}</Label>
              <Textarea
                value={config.instructions || ""}
                onChange={(e) => setEdit(m.id, "instructions", e.target.value)}
                placeholder={t("تعليمات التحويل عبر زين كاش", "Zain Cash transfer instructions")}
                rows={3}
              />
            </div>
          </div>
        );
      case "bank_card":
        return (
          <div className="space-y-3">
            <div>
              <Label>{t("بوابة الدفع", "Payment Gateway")}</Label>
              <Input
                value={config.gateway || ""}
                onChange={(e) => setEdit(m.id, "gateway", e.target.value)}
                placeholder={t("مثال: Stripe, PayPal", "e.g. Stripe, PayPal")}
              />
            </div>
            <div>
              <Label>{t("مفتاح API (اختياري)", "API Key (optional)")}</Label>
              <Input
                value={config.api_key || ""}
                onChange={(e) => setEdit(m.id, "api_key", e.target.value)}
                placeholder="pk_live_..."
                dir="ltr"
                type="password"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
          <Settings className="h-6 w-6" style={{ color: "hsl(var(--gold))" }} />
          {t("طرق الدفع", "Payment Methods")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("إدارة طرق الدفع المتاحة للمستأجرين", "Manage payment methods available to tenants")}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
      ) : (
        <div className="grid gap-4">
          {methods.map((m: any) => (
            <Card key={m.id} className={`border-border/50 transition-all ${m.is_enabled ? "ring-1 ring-primary/30" : "opacity-75"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>
                      {METHOD_ICONS[m.key] || <CreditCard className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="font-heading text-base">{t(m.name_ar, m.name_en)}</CardTitle>
                      <p className="text-xs text-muted-foreground">{m.key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={m.is_enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                      {m.is_enabled ? t("مفعّل", "Enabled") : t("معطّل", "Disabled")}
                    </Badge>
                    <Switch checked={m.is_enabled} onCheckedChange={(v) => handleToggle(m, v)} />
                  </div>
                </div>
              </CardHeader>
              {m.is_enabled && (
                <CardContent className="space-y-4">
                  {renderConfigFields(m)}
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleSaveConfig(m)}
                    disabled={!Object.keys(getEdit(m.id)).length}
                  >
                    <Save className="h-4 w-4" />
                    {t("حفظ الإعدادات", "Save Settings")}
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
