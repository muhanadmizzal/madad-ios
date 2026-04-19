import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Scissors, Users, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function TathbeetDashboard() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayBookings = [] } = useQuery({
    queryKey: ["tathbeet-bookings-today", companyId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_bookings")
        .select("id, customer_name, time_slot, status, tathbeet_services(name)")
        .eq("company_id", companyId!)
        .eq("booking_date", today)
        .order("time_slot");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: staffCount = 0 } = useQuery({
    queryKey: ["tathbeet-staff-count", companyId],
    queryFn: async () => {
      const { count } = await supabase
        .from("tathbeet_staff_profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("booking_enabled", true);
      return count || 0;
    },
    enabled: !!companyId,
  });

  const { data: serviceCount = 0 } = useQuery({
    queryKey: ["tathbeet-service-count", companyId],
    queryFn: async () => {
      const { count } = await supabase
        .from("tathbeet_services")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!companyId,
  });

  const stats = [
    { labelAr: "حجوزات اليوم", labelEn: "Today's Bookings", value: todayBookings.length, icon: <CalendarCheck className="h-5 w-5" /> },
    { labelAr: "موظفين نشطين", labelEn: "Active Staff", value: staffCount, icon: <Users className="h-5 w-5" /> },
    { labelAr: "خدمات متاحة", labelEn: "Active Services", value: serviceCount, icon: <Scissors className="h-5 w-5" /> },
  ];

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    confirmed: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-extrabold text-2xl">{t("لوحة تحكم تثبيت", "Tathbeet Dashboard")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>{s.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{t(s.labelAr, s.labelEn)}</p>
                <p className="font-heading font-bold text-2xl">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5">
          <h2 className="font-heading font-bold text-lg mb-4">{t("حجوزات اليوم", "Today's Bookings")}</h2>
          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>{t("لا توجد حجوزات اليوم", "No bookings today")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{b.time_slot?.slice(0, 5)}</span>
                    <div>
                      <p className="text-sm font-medium">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{(b as any).tathbeet_services?.name}</p>
                    </div>
                  </div>
                  <Badge className={statusColor[b.status] || ""}>{t(b.status === "pending" ? "معلّق" : b.status === "confirmed" ? "مؤكد" : b.status === "completed" ? "مكتمل" : "ملغى", b.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
