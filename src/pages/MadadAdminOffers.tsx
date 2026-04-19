import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";

export default function MadadAdminOffers() {
  const { t } = useLanguage();

  const { data: offers = [] } = useQuery({
    queryKey: ["admin-madad-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_offers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl">{t("إدارة العروض", "Manage Offers")}</h1>
        <p className="text-sm text-muted-foreground">{t("عرض وإدارة العروض الترويجية", "View and manage promotional offers")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((o: any) => (
          <Card key={o.id} className="border-border/50">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0"><Gift className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading font-bold">{t(o.title_ar, o.title_en)}</h3>
                  <Badge className={o.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>{o.is_active ? t("نشط", "Active") : t("منتهي", "Expired")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t(o.description_ar, o.description_en)}</p>
                <p className="text-xs text-muted-foreground mt-1">{o.discount_type}: {o.discount_value}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
