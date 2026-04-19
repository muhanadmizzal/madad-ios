import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MadadAdminModules() {
  const { t } = useLanguage();

  const { data: modules = [] } = useQuery({
    queryKey: ["admin-madad-modules"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_modules").select("*").order("sort_order");
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl">{t("إدارة الوحدات", "Manage Modules")}</h1>
        <p className="text-sm text-muted-foreground">{t("عرض وإدارة وحدات المنصة", "View and manage platform modules")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m: any) => (
          <Card key={m.id} className="border-border/50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg">{t(m.name_ar, m.name_en)}</h3>
                <Badge className={m.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{m.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t(m.description_ar, m.description_en)}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t("المفتاح:", "Key:")} {m.key}</span>
                <span>•</span>
                <span>{t("الأيقونة:", "Icon:")} {m.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
