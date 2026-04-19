import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function MadadNotifications() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-extrabold text-2xl">{t("الإشعارات", "Notifications")}</h1>
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>{t("لا توجد إشعارات جديدة", "No new notifications")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
