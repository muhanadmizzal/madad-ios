import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { MadadNav } from "@/components/madad/MadadNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, X, ArrowLeft, ArrowRight, Gift, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MODULE_LABELS: Record<string, { ar: string; en: string }> = {
  tamkeen: { ar: "تمكين", en: "Tamkeen" },
  tathbeet: { ar: "تثبيت", en: "Tathbeet" },
  tahseel: { ar: "تحصيل", en: "Tahseel" },
  takzeen: { ar: "تخزين", en: "Takzeen" },
};

export default function MadadPricing() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const { data: packages = [] } = useQuery({
    queryKey: ["madad-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_packages").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: pkgCatalogFeatures = [] } = useQuery({
    queryKey: ["pkg-catalog-features"],
    queryFn: async () => {
      const { data } = await supabase.from("package_catalog_features").select("package_id, feature_key, module_key, feature_catalog(name, name_ar, pricing_status)");
      return data || [];
    },
  });

  const { data: activeOffers = [] } = useQuery({
    queryKey: ["active-madad-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_offers").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const formatPrice = (price: number) => new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(price);

  const getFeaturesForPackage = (pkgId: string) => {
    return pkgCatalogFeatures.filter((pf: any) => pf.package_id === pkgId && pf.feature_catalog?.pricing_status !== "hidden");
  };

  const getModulesForPackage = (pkgId: string) => {
    const keys = [...new Set(pkgCatalogFeatures.filter((pf: any) => pf.package_id === pkgId).map((pf: any) => pf.module_key))];
    return keys;
  };

  const getOffersForPackage = (pkgId: string) => {
    const now = new Date();
    return activeOffers.filter((o: any) => {
      const appliesTo = o.apply_to_packages || [];
      if (appliesTo.length > 0 && !appliesTo.includes(pkgId)) return false;
      if (o.starts_at && new Date(o.starts_at) > now) return false;
      if (o.expires_at && new Date(o.expires_at) < now) return false;
      return true;
    });
  };

  const calcDiscountedPrice = (price: number, pkgId: string) => {
    const offers = getOffersForPackage(pkgId);
    let discounted = price;
    for (const o of offers) {
      if (o.offer_type === "discount" || o.offer_type === "conditional") {
        if (o.offer_type === "conditional" && o.condition_type === "billing_period" && o.condition_value === "yearly" && !yearly) continue;
        if (o.discount_type === "percentage") {
          discounted -= discounted * (o.discount_value / 100);
        } else {
          discounted -= o.discount_value;
        }
      }
    }
    return Math.max(0, Math.round(discounted));
  };

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <MadadNav />

      <section className="pt-28 pb-8 px-4 text-center">
        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-foreground mb-4">{t("الأسعار والباقات", "Pricing & Plans")}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">{t("اختر الباقة المناسبة لحجم أعمالك. يمكنك الترقية في أي وقت.", "Choose the plan that fits your business. Upgrade anytime.")}</p>
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>{t("شهري", "Monthly")}</span>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>{t("سنوي", "Yearly")}</span>
          {yearly && <Badge className="bg-success/10 text-success border-success/20 text-xs">{t("وفّر ١٧٪", "Save 17%")}</Badge>}
        </div>
      </section>

      {/* Active Offers Banner */}
      {activeOffers.length > 0 && (
        <section className="px-4 pb-6">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-3">
            {activeOffers.map((o: any) => (
              <div key={o.id} className="flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5">
                <Gift className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{t(o.title_ar, o.title_en)}</span>
                {o.offer_type === "discount" && (
                  <Badge className="bg-accent/10 text-accent text-xs">{o.discount_type === "percentage" ? `${o.discount_value}%` : `${o.discount_value} IQD`} {t("خصم", "off")}</Badge>
                )}
                {o.offer_type === "subscription_bonus" && (
                  <Badge className="bg-accent/10 text-accent text-xs">{o.bonus_months} {t("أشهر مجانية", "free months")}</Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Package Cards */}
      <section className="pb-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg: any) => {
            const basePrice = yearly ? pkg.yearly_price : pkg.monthly_price;
            const finalPrice = calcDiscountedPrice(basePrice, pkg.id);
            const hasDiscount = finalPrice < basePrice;
            const features = getFeaturesForPackage(pkg.id);
            const moduleKeys = getModulesForPackage(pkg.id);
            const pkgOffers = getOffersForPackage(pkg.id);
            const bonusFeatures = pkgOffers.filter((o: any) => o.offer_type === "feature_bonus").flatMap((o: any) => o.bonus_feature_keys || []);
            const bonusMonths = pkgOffers.filter((o: any) => o.offer_type === "subscription_bonus").reduce((s: number, o: any) => s + (o.bonus_months || 0), 0);

            return (
              <Card key={pkg.id} className={`border-border/50 relative ${pkg.is_popular ? "ring-2 ring-accent shadow-brand-lg scale-[1.03]" : ""}`}>
                {pkg.is_popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3">{t(pkg.badge_ar || "الأكثر شعبية", pkg.badge_en || "Most Popular")}</Badge>}
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="font-heading font-bold text-xl">{t(pkg.name_ar, pkg.name_en)}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t(pkg.description_ar, pkg.description_en)}</p>
                    <div className="mt-3">
                      {hasDiscount && (
                        <p className="text-sm text-muted-foreground line-through">{formatPrice(basePrice)} {pkg.currency}</p>
                      )}
                      <p className="text-accent font-bold text-3xl">
                        {formatPrice(finalPrice)} <span className="text-sm font-normal text-muted-foreground">{pkg.currency}/{yearly ? t("سنوياً", "year") : t("شهرياً", "month")}</span>
                      </p>
                    </div>
                  </div>

                  {/* Active offers for this package */}
                  {(hasDiscount || bonusMonths > 0 || bonusFeatures.length > 0) && (
                    <div className="space-y-1">
                      {hasDiscount && (
                        <div className="flex items-center gap-1.5 text-xs text-accent">
                          <Sparkles className="h-3 w-3" />
                          <span>{t("عرض خاص مفعّل", "Special offer active")}</span>
                        </div>
                      )}
                      {bonusMonths > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-accent">
                          <Gift className="h-3 w-3" />
                          <span>+{bonusMonths} {t("أشهر مجانية", "free months")}</span>
                        </div>
                      )}
                      {bonusFeatures.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-accent">
                          <Gift className="h-3 w-3" />
                          <span>+{bonusFeatures.length} {t("ميزات إضافية مجانية", "bonus features")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Included modules */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("الوحدات المضمّنة", "Included Modules")}</p>
                    <div className="flex flex-wrap gap-1">
                      {moduleKeys.map((mk: string) => (
                        <Badge key={mk} variant="secondary" className="text-xs">{t(MODULE_LABELS[mk]?.ar || mk, MODULE_LABELS[mk]?.en || mk)}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2">
                    {features.map((pf: any) => (
                      <li key={pf.feature_key} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        <span className="text-muted-foreground">{t(pf.feature_catalog?.name_ar || pf.feature_key, pf.feature_catalog?.name || pf.feature_key)}</span>
                      </li>
                    ))}
                    {bonusFeatures.map((bk: string) => (
                      <li key={bk} className="flex items-center gap-2 text-sm">
                        <Gift className="h-4 w-4 text-accent shrink-0" />
                        <span className="text-accent font-medium">{bk} <span className="text-[10px]">({t("مجاني", "FREE")})</span></span>
                      </li>
                    ))}
                  </ul>

                  <Button variant={pkg.is_popular ? "default" : "outline"} className="w-full font-heading gap-2" onClick={() => navigate("/auth?mode=signup")}>
                    {t("ابدأ الآن", "Get Started")}
                    <Arrow className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      {packages.length > 0 && (
        <section className="pb-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading font-bold text-2xl text-center mb-8">{t("مقارنة تفصيلية", "Detailed Comparison")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start p-3 text-sm font-medium text-muted-foreground">{t("الميزة", "Feature")}</th>
                    {packages.map((pkg: any) => (
                      <th key={pkg.id} className="p-3 text-center text-sm font-heading font-bold">{t(pkg.name_ar, pkg.name_en)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <td className="p-3 text-sm font-medium">{t("السعر الشهري", "Monthly Price")}</td>
                    {packages.map((pkg: any) => (
                      <td key={pkg.id} className="p-3 text-center text-sm font-bold">{formatPrice(pkg.monthly_price)} {pkg.currency}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 text-sm font-medium">{t("الوحدات", "Modules")}</td>
                    {packages.map((pkg: any) => (
                      <td key={pkg.id} className="p-3 text-center text-sm">
                        {getModulesForPackage(pkg.id).map((mk: string) => t(MODULE_LABELS[mk]?.ar || mk, MODULE_LABELS[mk]?.en || mk)).join("، ")}
                      </td>
                    ))}
                  </tr>
                  {/* All unique feature keys across packages */}
                  {(() => {
                    const allKeys = [...new Set(pkgCatalogFeatures.filter((pf: any) => pf.feature_catalog?.pricing_status !== "hidden").map((pf: any) => pf.feature_key))];
                    return allKeys.map(fk => {
                      const label = pkgCatalogFeatures.find((pf: any) => pf.feature_key === fk);
                      return (
                        <tr key={fk} className="border-b border-border/50">
                          <td className="p-3 text-sm">{t(label?.feature_catalog?.name_ar || fk, label?.feature_catalog?.name || fk)}</td>
                          {packages.map((pkg: any) => {
                            const has = pkgCatalogFeatures.some((pf: any) => pf.package_id === pkg.id && pf.feature_key === fk);
                            return (
                              <td key={pkg.id} className="p-3 text-center">
                                {has ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-8 px-4 bg-card text-center">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {t("مدد", "MADAD")}. {t("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
      </footer>
    </div>
  );
}
