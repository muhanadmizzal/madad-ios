import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMadadSubscription } from "@/hooks/useMadadSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALL_MODULES, MODULE_REGISTRY } from "@/lib/moduleConfig";
import { ArrowLeft, ArrowRight, Lock, CheckCircle2, Zap, ExternalLink } from "lucide-react";

export default function MadadModulesPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const { isModuleActive, subscription } = useMadadSubscription();

  const planLabel = subscription.package
    ? t(subscription.package.name_ar, subscription.package.name_en)
    : t("بدون اشتراك", "No Plan");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl">{t("إدارة الوحدات", "Module Management")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("إدارة وحدات مدد المتاحة لمنشأتك — الباقة:", "Manage MADAD modules — Plan:")}
            {" "}
            <span className="font-medium text-foreground">{planLabel}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/madad/billing")} className="gap-1.5 shrink-0">
          <Zap className="h-3.5 w-3.5" />
          {t("ترقية الباقة", "Upgrade Plan")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {ALL_MODULES.map((m) => {
          const active = isModuleActive(m.key);
          const locked = !active;
          return (
            <Card
              key={m.key}
              className={`border-border/50 transition-all duration-300 overflow-hidden ${active ? "cursor-pointer hover:shadow-brand-lg hover:-translate-y-1" : "opacity-60"}`}
              onClick={() => active && navigate(m.route)}
            >
              {active && <div className="h-1 w-full bg-success" />}
              {locked && <div className="h-1 w-full bg-muted-foreground/30" />}
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <img src={m.iconLogo} alt={t(m.nameAr, m.nameEn)} className="h-16 w-16 object-contain" loading="lazy" />
                  <div className="flex flex-col items-end gap-1">
                    {active && <Badge className="bg-success/10 text-success border-success/20">{t("فعّال", "Active")}</Badge>}
                    {locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />{t("مقفل", "Locked")}</Badge>}
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">{t(m.nameAr, m.nameEn)}</h3>
                  <p className="text-sm" style={{ color: "hsl(var(--gold))" }}>{t("من مدد", "BY MADAD")}</p>
                </div>
                <p className="text-sm text-muted-foreground">{t(m.descAr, m.descEn)}</p>
                {active && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      {t("مُفعّل ضمن اشتراكك", "Included in your plan")}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs px-2">
                      {t("فتح", "Open")}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {locked && (
                  <div className="pt-2 border-t border-border/30">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/madad/activate/${m.key}`); }}>
                      <Zap className="h-3 w-3" />
                      {t("تفعيل الوحدة", "Activate Module")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
