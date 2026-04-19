import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, Search, ToggleRight, CheckCircle2, XCircle, Package,
  ChevronLeft, ChevronRight, Layers, Zap, Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logBusinessAction } from "@/hooks/useBusinessAudit";
import { BPPageHeader, BPPageSkeleton } from "@/components/business-portal/BPDesignSystem";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";

export default function BPTenantFeatures() {
  const qc = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // Tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["bp-tenants-list"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, name_ar, status").order("name");
      return data || [];
    },
  });

  // Feature catalog
  const { data: catalog = [] } = useQuery({
    queryKey: ["bp-feature-catalog-full"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_catalog").select("*").eq("is_active", true).order("sort_order" as any);
      return data || [];
    },
  });

  // Tenant features for selected tenant
  const { data: tenantFeatures = [] } = useQuery({
    queryKey: ["bp-tenant-features", selectedTenant],
    queryFn: async () => {
      if (!selectedTenant) return [];
      const { data } = await supabase
        .from("tenant_features")
        .select("*")
        .eq("company_id", selectedTenant);
      return data || [];
    },
    enabled: !!selectedTenant,
  });

  // Tenant modules (madad_tenant_modules)
  const { data: tenantModules = [] } = useQuery({
    queryKey: ["bp-tenant-modules", selectedTenant],
    queryFn: async () => {
      if (!selectedTenant) return [];
      const { data } = await supabase
        .from("madad_tenant_modules")
        .select("*, madad_modules(key, name_en, name_ar)")
        .eq("company_id", selectedTenant);
      return data || [];
    },
    enabled: !!selectedTenant,
  });

  const activeFeatureSet = useMemo(() => {
    return new Set(tenantFeatures.filter((tf: any) => tf.status === "active").map((tf: any) => tf.feature_key));
  }, [tenantFeatures]);

  const categories = useMemo(() => [...new Set(catalog.map((c: any) => c.category))], [catalog]);

  const filteredCatalog = useMemo(() => {
    let list = catalog;
    if (catFilter !== "all") list = list.filter((c: any) => c.category === catFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.name_ar || "").includes(q) ||
        (c.key || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalog, catFilter, searchQuery]);

  // Toggle feature for tenant (immediate — admin override)
  const toggleFeature = useMutation({
    mutationFn: async ({ featureKey, enable }: { featureKey: string; enable: boolean }) => {
      if (!selectedTenant) throw new Error("No tenant");

      if (enable) {
        const catItem = catalog.find((c: any) => c.key === featureKey);
        const existing = tenantFeatures.find((tf: any) => tf.feature_key === featureKey);
        if (existing) {
          const { error } = await supabase
            .from("tenant_features")
            .update({
              status: "active",
              source: "admin_override",
              module_key: catItem?.module_key || null,
              activated_at: new Date().toISOString(),
              deactivated_at: null,
            } as any)
            .eq("id", (existing as any).id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("tenant_features").insert({
            company_id: selectedTenant,
            feature_key: featureKey,
            module_key: catItem?.module_key || null,
            status: "active",
            source: "admin_override",
            activated_at: new Date().toISOString(),
          } as any);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from("tenant_features")
          .update({ status: "inactive", source: "admin_override", deactivated_at: new Date().toISOString() } as any)
          .eq("company_id", selectedTenant)
          .eq("feature_key", featureKey);
        if (error) throw error;
      }

      await logBusinessAction(
        enable ? "admin_enable_feature" : "admin_disable_feature",
        "tenant_features",
        selectedTenant,
        undefined,
        undefined,
        { feature_key: featureKey, tenant_id: selectedTenant }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bp-tenant-features", selectedTenant] });
      toast({ title: "تم التحديث" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Toggle module for tenant
  const toggleModule = useMutation({
    mutationFn: async ({ moduleKey, enable }: { moduleKey: string; enable: boolean }) => {
      if (!selectedTenant) throw new Error("No tenant");

      // Get module id
      const { data: mod } = await supabase.from("madad_modules").select("id").eq("key", moduleKey).maybeSingle();
      if (!mod) throw new Error("Module not found");

      const existing = tenantModules.find((tm: any) => tm.module_id === mod.id);
      if (existing) {
        const { error } = await supabase
          .from("madad_tenant_modules")
          .update({ is_active: enable, activated_at: enable ? new Date().toISOString() : undefined } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else if (enable) {
        const { error } = await supabase.from("madad_tenant_modules").insert({
          company_id: selectedTenant,
          module_id: mod.id,
          is_active: true,
          activated_at: new Date().toISOString(),
        } as any);
        if (error) throw error;
      }

      await logBusinessAction(
        enable ? "admin_activate_module" : "admin_deactivate_module",
        "madad_tenant_modules",
        selectedTenant,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bp-tenant-modules", selectedTenant] });
      toast({ title: "تم التحديث" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const activeModuleKeys = useMemo(() => {
    return new Set(tenantModules.filter((tm: any) => tm.is_active).map((tm: any) => tm.madad_modules?.key));
  }, [tenantModules]);

  const CATEGORY_LABELS: Record<string, string> = {
    core: "أساسي", hr: "موارد بشرية", ai: "ذكاء اصطناعي",
    analytics: "تحليلات", admin: "إدارة", addon: "إضافات",
    employee: "خدمة ذاتية",
  };

  const selectedTenantName = tenants.find((t: any) => t.id === selectedTenant)?.name || "";

  if (tenantsLoading) return <BPPageSkeleton cards={3} />;

  return (
    <div className="space-y-6">
      <BPPageHeader
        title="إدارة ميزات المستأجرين"
        subtitle="تحكم بالوحدات والميزات لكل مستأجر — تفعيل وإلغاء مباشر"
      >
        <Badge variant="secondary" className="text-xs gap-1"><Building2 className="h-3 w-3" />{tenants.length} مستأجر</Badge>
      </BPPageHeader>

      {/* Tenant selector */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-2 block">{selectedTenant ? "المستأجر المحدد" : "اختر مستأجراً"}</Label>
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="اختر مستأجراً للتحكم بميزاته" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.name_ar || t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTenant && (
        <>
          {/* Modules control */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Package className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
                الوحدات — {selectedTenantName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(MODULE_REGISTRY).map((mod) => {
                  const isActive = activeModuleKeys.has(mod.key);
                  return (
                    <div key={mod.key} className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${isActive ? "bg-success/5 border-success/20" : "bg-muted/20 border-border/50"}`}>
                      <img src={mod.iconLogo} alt={mod.nameEn} className="h-10 w-10" />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-sm">{mod.nameAr}</p>
                        <p className="text-xs text-muted-foreground">{mod.descAr}</p>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => toggleModule.mutate({ moduleKey: mod.key, enable: v })}
                        disabled={toggleModule.isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Features control */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <ToggleRight className="h-5 w-5 text-primary" />
                الميزات — {selectedTenantName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search + filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن ميزة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button variant={catFilter === "all" ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setCatFilter("all")}>
                  الكل ({catalog.length})
                </Button>
                {categories.map((cat) => (
                  <Button key={cat} variant={catFilter === cat ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setCatFilter(cat)}>
                    {CATEGORY_LABELS[cat] || cat} ({catalog.filter((c: any) => c.category === cat).length})
                  </Button>
                ))}
              </div>

              {/* Features table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">الحالة</TableHead>
                      <TableHead>الميزة</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead className="text-end">السعر</TableHead>
                      <TableHead className="w-16">تحكم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCatalog.map((f: any) => {
                      const isActive = activeFeatureSet.has(f.key);
                      return (
                        <TableRow key={f.id} className={isActive ? "bg-success/5" : ""}>
                          <TableCell>
                            {isActive ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{f.name_ar || f.name}</p>
                              {f.description && <p className="text-[10px] text-muted-foreground">{f.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px]">{CATEGORY_LABELS[f.category] || f.category}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.module_key || "—"}</TableCell>
                          <TableCell className="text-end tabular-nums text-sm font-medium">
                            {f.pricing_status === "free" ? "مجاني" : `$${f.monthly_price}`}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={isActive}
                              onCheckedChange={(v) => toggleFeature.mutate({ featureKey: f.key, enable: v })}
                              disabled={toggleFeature.isPending}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border text-sm">
                <span>الميزات المفعّلة: <strong className="text-primary">{activeFeatureSet.size}</strong> / {catalog.length}</span>
                <span className="font-heading font-bold">
                  الإجمالي: ${catalog.filter((c: any) => activeFeatureSet.has(c.key)).reduce((s: number, c: any) => s + (c.monthly_price || 0), 0).toFixed(2)}/شهر
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
