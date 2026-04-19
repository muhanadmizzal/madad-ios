import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard } from "lucide-react";

export default function MadadAdminSubscriptions() {
  const { t } = useLanguage();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-madad-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_tenant_subscriptions").select("*, companies(name, name_ar), madad_packages(name_ar, name_en, key)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const statusColor = (s: string) => {
    if (s === "active") return "bg-success/10 text-success";
    if (s === "trial") return "bg-info/10 text-info";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl">{t("الاشتراكات", "Subscriptions")}</h1>
          <p className="text-sm text-muted-foreground">{t("عرض جميع اشتراكات العملاء", "View all tenant subscriptions")}</p>
        </div>
        <Badge variant="secondary">{subscriptions.length} {t("اشتراك", "subscriptions")}</Badge>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t("لا توجد اشتراكات بعد", "No subscriptions yet")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((sub: any) => (
            <Card key={sub.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-heading font-bold">{sub.companies?.name_ar || sub.companies?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{t("الباقة:", "Plan:")} {t(sub.madad_packages?.name_ar, sub.madad_packages?.name_en)} • {sub.billing_cycle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColor(sub.status)}>{sub.status}</Badge>
                  {sub.start_date && <span className="text-xs text-muted-foreground">{sub.start_date}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
