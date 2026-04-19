import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { HybridAccessSummaryCard } from "@/components/madad/HybridAccessSummaryCard";

export default function MadadSettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-extrabold text-2xl">
        {t("إعدادات المنشأة", "Organization Settings")}
      </h1>

      {/* Hybrid Access — platform-wide tenant capability */}
      <HybridAccessSummaryCard variant="full" />

      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Settings className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>{t("إعدادات المنشأة العامة ستتوفر قريباً", "Organization-wide settings coming soon")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
