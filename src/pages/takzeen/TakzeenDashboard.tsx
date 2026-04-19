import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Warehouse, AlertTriangle, TrendingUp, ArrowDownUp, Truck } from "lucide-react";

export default function TakzeenDashboard() {
  const { t } = useLanguage();
  const { companyId } = useCompany();

  const { data: products } = useQuery({
    queryKey: ["takzeen-products-summary", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_products").select("id, name, current_stock, reorder_level, is_active").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["takzeen-warehouses-count", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_warehouses").select("id").eq("company_id", companyId).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: movements } = useQuery({
    queryKey: ["takzeen-movements-recent", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("takzeen_stock_movements").select("id, movement_type, quantity, movement_date, product_id").eq("company_id", companyId).order("movement_date", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!companyId,
  });

  const totalProducts = products?.length || 0;
  const lowStock = products?.filter(p => Number(p.current_stock) <= Number(p.reorder_level) && p.is_active).length || 0;
  const totalWarehouses = warehouses?.length || 0;
  const recentMovements = movements?.length || 0;

  const kpis = [
    { label: t("إجمالي المنتجات", "Total Products"), value: totalProducts.toString(), icon: Package, color: "text-purple-500" },
    { label: t("تحت الحد الأدنى", "Low Stock"), value: lowStock.toString(), icon: AlertTriangle, color: lowStock > 0 ? "text-destructive" : "text-success" },
    { label: t("المستودعات", "Warehouses"), value: totalWarehouses.toString(), icon: Warehouse, color: "text-purple-500" },
    { label: t("حركات أخيرة", "Recent Movements"), value: recentMovements.toString(), icon: ArrowDownUp, color: "text-purple-500" },
  ];

  const movementTypeLabels: Record<string, string> = { in: t("إدخال", "In"), out: t("إخراج", "Out"), adjustment: t("تعديل", "Adjust"), return: t("إرجاع", "Return"), transfer: t("تحويل", "Transfer") };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <Package className="h-6 w-6" style={{ color: "#5B21B6" }} />
          {t("تخزين — إدارة المخزون", "Takzeen — Inventory")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("نظرة شاملة على المخزون والمستودعات", "Overview of inventory and warehouses")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
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
        {/* Low stock alerts */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("تنبيهات المخزون", "Stock Alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!lowStock ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("لا توجد تنبيهات", "No alerts")}</p>
            ) : (
              <div className="space-y-3">
                {products?.filter(p => Number(p.current_stock) <= Number(p.reorder_level) && p.is_active).slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant="destructive">{Number(p.current_stock)} / {Number(p.reorder_level)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent movements */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5" style={{ color: "#5B21B6" }} />
              {t("آخر الحركات", "Recent Movements")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!movements?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("لا توجد حركات", "No movements")}</p>
            ) : (
              <div className="space-y-3">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <Badge variant="outline">{movementTypeLabels[m.movement_type] || m.movement_type}</Badge>
                    <span className="text-sm font-medium">{Number(m.quantity)}</span>
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
