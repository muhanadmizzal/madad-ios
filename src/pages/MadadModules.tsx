import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { MadadNav } from "@/components/madad/MadadNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ALL_MODULES } from "@/lib/moduleConfig";

export default function MadadModules() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const MODULES = ALL_MODULES.map((m) => ({
    key: m.key,
    nameAr: m.nameAr,
    nameEn: m.nameEn,
    descAr: m.descAr,
    descEn: m.descEn,
    logo: m.iconLogo,
    route: m.route,
  }));

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <MadadNav />

      <section className="pt-28 pb-8 px-4 text-center">
        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-foreground mb-4">{t("وحدات مدد", "MADAD Modules")}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("اكتشف جميع وحدات مدد المصممة لتبسيط عملياتك.", "Discover all MADAD modules designed to streamline your operations.")}</p>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          {MODULES.map((m) => (
            <Card key={m.key} className="border-border/50 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-56 p-6 flex flex-col items-center justify-center bg-muted/50">
                  <img src={m.logo} alt={t(m.nameAr, m.nameEn)} className="h-24 w-24 object-contain" loading="lazy" />
                  <p className="text-xs font-medium mt-2" style={{ color: "hsl(var(--gold))" }}>
                    {t("من مدد", "BY MADAD")}
                  </p>
                </div>
                <CardContent className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-heading font-bold text-xl text-foreground">{t(m.nameAr, m.nameEn)}</h3>
                      <p className="text-muted-foreground mt-1">{t(m.descAr, m.descEn)}</p>
                    </div>
                    <Badge variant="default" className="text-xs bg-success text-success-foreground">{t("مفعل", "Live")}</Badge>
                  </div>
                  <Button variant="ghost" className="gap-2 px-0 text-accent hover:text-accent/80" onClick={() => navigate(`/modules/${m.key}`)}>
                    {t("عرض التفاصيل", "View Details")}
                    <Arrow className="h-4 w-4" />
                  </Button>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4 bg-card text-center">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {t("مدد", "MADAD")}. {t("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
      </footer>
    </div>
  );
}
