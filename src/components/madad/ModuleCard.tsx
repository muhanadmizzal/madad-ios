import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface ModuleInfo {
  key: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  logo: string;
  route?: string;
}

export function ModuleCard({ module }: { module: ModuleInfo }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <Card className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:shadow-brand-lg hover:-translate-y-1">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <img src={module.logo} alt={t(module.nameAr, module.nameEn)} className="h-14 w-14 object-contain" loading="lazy" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">
            {t(module.nameAr, module.nameEn)}
          </h3>
          <p className="text-sm font-medium" style={{ color: "hsl(var(--gold))" }}>
            {t("من مدد", "BY MADAD")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t(module.descAr, module.descEn)}
        </p>
        <Button
          variant="ghost"
          className="gap-2 px-0 text-accent hover:text-accent/80"
          onClick={() => navigate(module.route || `/modules/${module.key}`)}
        >
          {t("عرض التفاصيل", "View Details")}
          <Arrow className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
