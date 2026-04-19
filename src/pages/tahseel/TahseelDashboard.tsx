import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Receipt, FileText, CreditCard } from "lucide-react";

export default function TahseelDashboard() {
  const { t } = useLanguage();
  const { companyId } = useCompany();

  const { data: invoices } = useQuery({
    queryKey: ["tahseel-invoices-summary", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_invoices").select("id, total, status").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: expenses } = useQuery({
    queryKey: ["tahseel-expenses-summary", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_expenses").select("id, amount, status").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const totalRevenue = invoices?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0) || 0;
  const pendingInvoices = invoices?.filter(i => i.status === "draft" || i.status === "sent").length || 0;
  const totalExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  const kpis = [
    { label: t("إجمالي الإيرادات", "Total Revenue"), value: totalRevenue.toLocaleString(), icon: TrendingUp, color: "text-success" },
    { label: t("إجمالي المصروفات", "Total Expenses"), value: totalExpenses.toLocaleString(), icon: TrendingDown, color: "text-destructive" },
    { label: t("صافي الربح", "Net Profit"), value: netProfit.toLocaleString(), icon: DollarSign, color: netProfit >= 0 ? "text-success" : "text-destructive" },
    { label: t("فواتير معلقة", "Pending Invoices"), value: pendingInvoices.toString(), icon: Receipt, color: "text-warning" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6" style={{ color: "#0FA968" }} />
          {t("تحصيل — الإدارة المالية", "Tahseel — Finance")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("نظرة شاملة على الأداء المالي", "Overview of financial performance")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 opacity-20 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: "#0FA968" }} />
              {t("آخر الفواتير", "Recent Invoices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!invoices?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("لا توجد فواتير بعد", "No invoices yet")}</p>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{Number(inv.total).toLocaleString()} IQD</span>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" style={{ color: "#0FA968" }} />
              {t("آخر المصروفات", "Recent Expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!expenses?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("لا توجد مصروفات بعد", "No expenses yet")}</p>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 5).map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{Number(exp.amount).toLocaleString()} IQD</span>
                    <Badge variant={exp.status === "paid" ? "default" : "secondary"}>{exp.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
