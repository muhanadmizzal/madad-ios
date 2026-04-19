import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, AlertTriangle, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function TathbeetCustomers() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const [search, setSearch] = useState("");

  // Get unique customers from bookings
  const { data: customers = [] } = useQuery({
    queryKey: ["tathbeet-customers", companyId],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("tathbeet_bookings")
        .select("customer_name, customer_phone, customer_email, status")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (!bookings) return [];

      // Aggregate by phone or name
      const map = new Map<string, { name: string; phone: string; email: string; total: number; completed: number; cancelled: number; noShow: number }>();
      for (const b of bookings) {
        const key = b.customer_phone || b.customer_name;
        if (!key) continue;
        const existing = map.get(key) || { name: b.customer_name, phone: b.customer_phone || "", email: b.customer_email || "", total: 0, completed: 0, cancelled: 0, noShow: 0 };
        existing.total++;
        if (b.status === "completed") existing.completed++;
        if (b.status === "cancelled") existing.cancelled++;
        if (b.status === "no_show") existing.noShow++;
        if (!existing.name && b.customer_name) existing.name = b.customer_name;
        map.set(key, existing);
      }

      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
    enabled: !!companyId,
  });

  const filtered = customers.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const getRiskLevel = (c: typeof customers[0]) => {
    if (c.total === 0) return "low";
    const score = (c.cancelled + c.noShow * 2) / c.total;
    if (score > 0.5) return "high";
    if (score > 0.2) return "medium";
    return "low";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-extrabold text-2xl">{t("العملاء", "Customers")}</h1>
        <Badge variant="outline">{filtered.length} {t("عميل", "customers")}</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("بحث بالاسم أو الهاتف...", "Search by name or phone...")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا يوجد عملاء بعد", "No customers yet")}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, i) => {
            const risk = getRiskLevel(c);
            return (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {c.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone} {c.email && `• ${c.email}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-center">
                      <p className="font-bold text-sm">{c.total}</p>
                      <p className="text-[10px] text-muted-foreground">{t("حجوزات", "bookings")}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm text-success">{c.completed}</p>
                      <p className="text-[10px] text-muted-foreground">{t("مكتمل", "done")}</p>
                    </div>
                    {c.noShow > 0 && (
                      <Badge variant="outline" className="text-warning border-warning/30 gap-1">
                        <AlertTriangle className="h-3 w-3" />{c.noShow} {t("لم يحضر", "no-show")}
                      </Badge>
                    )}
                    {risk === "high" && <Badge className="bg-destructive/10 text-destructive border-destructive/20">{t("خطر عالي", "High Risk")}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
