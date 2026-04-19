import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MadadAdminPackages() {
  const { t, lang } = useLanguage();

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-madad-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_packages").select("*").order("sort_order");
      return data || [];
    },
  });

  const formatPrice = (price: number) => new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(price);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl">{t("إدارة الباقات", "Manage Packages")}</h1>
        <p className="text-sm text-muted-foreground">{t("عرض وإدارة باقات التسعير", "View and manage pricing packages")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg: any) => (
          <Card key={pkg.id} className={`border-border/50 ${pkg.is_popular ? "ring-2 ring-accent" : ""}`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg">{t(pkg.name_ar, pkg.name_en)}</h3>
                {pkg.is_popular && <Badge className="bg-accent/10 text-accent">{t("شائع", "Popular")}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{t(pkg.description_ar, pkg.description_en)}</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">{t("شهري:", "Monthly:")}</span> {formatPrice(pkg.monthly_price)} {pkg.currency}</p>
                <p className="text-sm"><span className="font-medium">{t("سنوي:", "Yearly:")}</span> {formatPrice(pkg.yearly_price)} {pkg.currency}</p>
              </div>
              <Badge variant={pkg.is_active ? "default" : "secondary"}>{pkg.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
