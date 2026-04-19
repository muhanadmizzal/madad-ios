import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, CreditCard, CalendarDays, FileText, BarChart3, GraduationCap,
  ClipboardList, Brain, Zap, Globe, Shield, CheckCircle, XCircle,
  Building2, Sparkles, Target, Timer, ListChecks, Clock, Wallet,
  Briefcase, ShoppingCart, DollarSign, Save, Pencil, Receipt, ToggleRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logBusinessAction } from "@/hooks/useBusinessAudit";
import {
  BPPageHeader, BPPageSkeleton, BPErrorState, BPDataTable, type BPColumn,
} from "@/components/business-portal/BPDesignSystem";
import { FEATURE_PORTAL_MAP, getCategoryLabel } from "@/lib/featurePortalMap";

const iconMap: Record<string, any> = {
  users: Users, clock: Clock, "calendar-days": CalendarDays, wallet: Wallet,
  briefcase: Briefcase, target: Target, "graduation-cap": GraduationCap,
  "file-text": FileText, "git-branch": Globe, "map-pin": Globe,
  "bar-chart-3": BarChart3, "check-square": CheckCircle, zap: Zap, bot: Brain,
  sparkles: Sparkles, brain: Brain, search: Globe, lightbulb: Zap,
  shield: Shield, "clipboard-check": ClipboardList, receipt: Receipt,
  "folder-kanban": Globe,
  hr_core: Users, attendance: CalendarDays, payroll: CreditCard, recruitment: ClipboardList,
  performance: Target, training: GraduationCap, documents: FileText, ai_assistant: Brain,
  ai_hr_assistant: Brain, ai_workforce_analytics: BarChart3, ai_recruitment_intelligence: ClipboardList,
  ai_gap_analysis: Zap, ai_planning_advisor: Timer, ai_employee_career_coach: Sparkles,
  api_access: Globe, sso: Globe, advanced_analytics: Zap, multi_branch: Shield,
  employee_management: Users, leave_management: CalendarDays, org_chart: Building2,
};

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  core: { en: "Core", ar: "أساسي" },
  hr: { en: "HR", ar: "موارد بشرية" },
  analytics: { en: "Analytics", ar: "تحليلات" },
  admin: { en: "Admin", ar: "إدارة" },
  ai: { en: "AI", ar: "ذكاء اصطناعي" },
};

interface PlatformFeature {
  id: string; feature_key: string; name: string; name_ar: string | null;
  plans: string[]; is_beta: boolean; enabled: boolean; sort_order: number;
}

export default function BPFeatures() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editPerUser, setEditPerUser] = useState("");
  const [editPricingType, setEditPricingType] = useState("flat");
  const [catFilter, setCatFilter] = useState("all");
  const [subsPage, setSubsPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);
  const [reqFilter, setReqFilter] = useState("pending");

  // ── Catalog (pricing) ──
  const { data: catalog = [], isLoading: catLoading, isError: catError, refetch: catRefetch } = useQuery({
    queryKey: ["bp-feature-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_catalog").select("*").order("sort_order" as any);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Platform features (global toggles) ──
  const { data: platformFeatures = [], isLoading: pfLoading } = useQuery({
    queryKey: ["platform-features"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_features").select("*").order("sort_order");
      if (error) throw error;
      return (data || []) as PlatformFeature[];
    },
  });

  // ── Tenant features (subscriptions) ──
  const { data: tenantSubs = [] } = useQuery({
    queryKey: ["bp-tenant-features-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_features")
        .select("*, companies:company_id(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["bp-companies-list"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      return data || [];
    },
  });

  // ── Feature change requests ──
  const { data: featureRequests = [] } = useQuery({
    queryKey: ["bp-feature-requests-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_change_requests")
        .select("*, companies:company_id(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: overrideCounts = {} } = useQuery({
    queryKey: ["tenant-override-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_feature_overrides").select("feature_key, enabled");
      if (error) throw error;
      const counts: Record<string, { enabled: number; disabled: number }> = {};
      (data || []).forEach((o: any) => {
        if (!counts[o.feature_key]) counts[o.feature_key] = { enabled: 0, disabled: 0 };
        if (o.enabled) counts[o.feature_key].enabled++;
        else counts[o.feature_key].disabled++;
      });
      return counts;
    },
  });

  // ── Mutations ──
  const updateCatalogItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("feature_catalog").update(updates).eq("id", id);
      if (error) throw error;
      await logBusinessAction("catalog_item_updated", "feature_catalog", id, undefined, undefined, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bp-feature-catalog"] });
      toast({ title: "تم التحديث" });
      setEditingItem(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const toggleCatalogActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("feature_catalog").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bp-feature-catalog"] }),
  });

  const togglePlatformFeature = useMutation({
    mutationFn: async ({ id, enabled, feature_key }: { id: string; enabled: boolean; feature_key: string }) => {
      const { error } = await supabase.from("platform_features").update({ enabled } as any).eq("id", id);
      if (error) throw error;
      await logBusinessAction(enabled ? "enable_feature" : "disable_feature", "platform_features", id, undefined, { enabled: !enabled }, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-features"] });
      toast({ title: "تم تحديث الميزة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في تحديث الميزة.", variant: "destructive" }),
  });

  const generateInvoice = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.rpc("generate_tenant_invoice", { p_company_id: companyId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success === false) { toast({ title: "ملاحظة", description: data.error, variant: "destructive" }); return; }
      toast({ title: "تم إنشاء الفاتورة", description: `#${data?.invoice_number}` });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.rpc("approve_feature_request", { p_request_id: id, p_reviewer_notes: notes || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bp-feature-requests-all"] });
      queryClient.invalidateQueries({ queryKey: ["bp-tenant-features-all"] });
      toast({ title: "تمت الموافقة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.rpc("reject_feature_request", { p_request_id: id, p_reviewer_notes: notes || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bp-feature-requests-all"] });
      toast({ title: "تم الرفض" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (catLoading || pfLoading) return <BPPageSkeleton cards={4} />;
  if (catError) return <BPErrorState onRetry={() => catRefetch()} />;

  const categories = [...new Set(catalog.map((c: any) => c.category))];
  const filteredCatalog = catFilter === "all" ? catalog : catalog.filter((c: any) => c.category === catFilter);

  const tenantSummary = companies.map((co: any) => {
    const features = tenantSubs.filter((s: any) => s.company_id === co.id && s.status === "active");
    return { ...co, feature_count: features.length, features };
  }).filter(c => c.feature_count > 0);

  const tenantColumns: BPColumn<any>[] = [
    { key: "name", header: "المستأجر", render: (r) => <span className="font-medium text-sm">{r.name}</span> },
    { key: "features", header: "الميزات المفعّلة", render: (r) => <span className="text-xs font-semibold text-primary">{r.feature_count}</span> },
    { key: "actions", header: "", render: (r) => (
      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1" onClick={() => generateInvoice.mutate(r.id)} disabled={generateInvoice.isPending}>
        <Receipt className="h-3 w-3" />فاتورة
      </Button>
    )},
  ];

  const startEdit = (item: any) => {
    setEditingItem(item.id);
    setEditPrice(String(item.monthly_price || 0));
    setEditPerUser(String(item.per_user_price || 0));
    setEditPricingType(item.pricing_type || "flat");
  };

  const saveEdit = (id: string) => {
    updateCatalogItem.mutate({
      id,
      updates: {
        monthly_price: parseFloat(editPrice) || 0,
        per_user_price: parseFloat(editPerUser) || 0,
        pricing_type: editPricingType,
      },
    });
  };

  // Merge platform features with portal map
  const mergedPlatformFeatures = FEATURE_PORTAL_MAP.map((mapEntry) => {
    const pf = platformFeatures.find((f) => f.feature_key === mapEntry.key);
    return { ...mapEntry, platformFeat: pf };
  });
  const pfCategories = ["core", "ai", "addon", "analytics", "employee"] as const;

  return (
    <div className="space-y-6">
      <BPPageHeader title="مركز إدارة الميزات والأسعار" subtitle="كتالوج الميزات • التحكم بالمنصة • اشتراكات المستأجرين — في مكان واحد">
        <Badge variant="secondary" className="text-xs">{catalog.length} ميزة</Badge>
      </BPPageHeader>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="catalog"><ShoppingCart className="h-3 w-3 ml-1" />الكتالوج والأسعار</TabsTrigger>
          <TabsTrigger value="requests"><ListChecks className="h-3 w-3 ml-1" />طلبات الميزات ({featureRequests.filter((r: any) => r.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="platform"><ToggleRight className="h-3 w-3 ml-1" />التحكم بالمنصة</TabsTrigger>
          <TabsTrigger value="tenants">اشتراكات المستأجرين ({tenantSummary.length})</TabsTrigger>
          <TabsTrigger value="mapping">خريطة الربط</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: CATALOG & PRICING ===== */}
        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={catFilter === "all" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setCatFilter("all")}>
              الكل ({catalog.length})
            </Button>
            {categories.map(cat => {
              const info = CATEGORY_LABELS[cat] || { en: cat, ar: cat };
              return (
                <Button key={cat} variant={catFilter === cat ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setCatFilter(cat)}>
                  {info.ar} ({catalog.filter((c: any) => c.category === cat).length})
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map((item: any) => {
              const isEditing = editingItem === item.id;
              const activeCount = tenantSubs.filter((s: any) => s.feature_key === item.key && s.status === "active").length;
              const Icon = iconMap[item.icon] || iconMap[item.key] || Zap;

              return (
                <Card key={item.id} className={`relative overflow-hidden ${!item.is_active ? "opacity-50" : ""}`}>
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-primary to-primary/40" />
                  <CardContent className="p-4 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{item.name_ar || item.name}</p>
                          <Badge variant="outline" className="text-[9px] mt-0.5">{(CATEGORY_LABELS[item.category] || { ar: item.category }).ar}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={item.is_active} onCheckedChange={(v) => toggleCatalogActive.mutate({ id: item.id, is_active: v })} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isEditing ? saveEdit(item.id) : startEdit(item)}>
                          {isEditing ? <Save className="h-3 w-3 text-primary" /> : <Pencil className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    {item.description && !isEditing && (
                      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{item.description}</p>
                    )}

                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[10px]">نوع التسعير</Label>
                          <Select value={editPricingType} onValueChange={setEditPricingType}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat">شهري ثابت</SelectItem>
                              <SelectItem value="per_user">لكل موظف</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {editPricingType === "flat" ? (
                          <div>
                            <Label className="text-[10px]">السعر الشهري ($)</Label>
                            <Input className="h-8 text-xs" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                          </div>
                        ) : (
                          <div>
                            <Label className="text-[10px]">سعر لكل موظف ($)</Label>
                            <Input className="h-8 text-xs" type="number" value={editPerUser} onChange={(e) => setEditPerUser(e.target.value)} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3 text-primary" />
                          <span className="text-sm font-bold text-foreground">
                            {item.pricing_type === "per_user"
                              ? `$${item.per_user_price}/موظف`
                              : item.monthly_price > 0 ? `$${item.monthly_price}/شهر` : "مجاني"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{activeCount} مستأجر</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== TAB: FEATURE REQUESTS ===== */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {["pending", "approved", "rejected", "all"].map(st => (
              <Button key={st} variant={reqFilter === st ? "default" : "outline"} size="sm" className="text-xs" onClick={() => { setReqFilter(st); setReqPage(1); }}>
                {st === "pending" ? `معلقة (${featureRequests.filter((r: any) => r.status === "pending").length})` : st === "approved" ? "موافق عليها" : st === "rejected" ? "مرفوضة" : "الكل"}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستأجر</TableHead>
                    <TableHead>الميزة</TableHead>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>التأثير الشهري</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureRequests
                    .filter((r: any) => reqFilter === "all" || r.status === reqFilter)
                    .slice((reqPage - 1) * 20, reqPage * 20)
                    .map((req: any) => {
                      const feature = catalog.find((c: any) => c.key === req.feature_key);
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-sm">{req.companies?.name || "—"}</TableCell>
                          <TableCell className="text-sm">{feature?.name_ar || req.feature_key}</TableCell>
                          <TableCell>
                            <Badge variant={req.action === "activate" ? "default" : "destructive"} className="text-[10px]">
                              {req.action === "activate" ? "تفعيل" : "إلغاء"}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">${Number(req.estimated_monthly_impact || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={req.status === "pending" ? "secondary" : req.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                              {req.status === "pending" ? "معلق" : req.status === "approved" ? "موافق" : req.status === "rejected" ? "مرفوض" : "ملغي"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(req.created_at).toLocaleDateString("ar-SA")}</TableCell>
                          <TableCell>
                            {req.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => approveRequest.mutate({ id: req.id })} disabled={approveRequest.isPending}>
                                  <CheckCircle className="h-3 w-3" />موافقة
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => rejectRequest.mutate({ id: req.id })} disabled={rejectRequest.isPending}>
                                  <XCircle className="h-3 w-3" />رفض
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {featureRequests.filter((r: any) => reqFilter === "all" || r.status === reqFilter).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد طلبات</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 2: PLATFORM FEATURE TOGGLES ===== */}
        <TabsContent value="platform" className="space-y-4 mt-4">
          {pfCategories.map((cat) => {
            const catFeatures = mergedPlatformFeatures.filter((f) => f.category === cat);
            if (catFeatures.length === 0) return null;
            const catLabel = getCategoryLabel(cat);
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{catLabel.ar}</Badge>
                  {catLabel.en}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catFeatures.map((feat) => {
                    const Icon = iconMap[feat.key] || Globe;
                    const pf = feat.platformFeat;
                    const platformEnabled = pf?.enabled ?? true;
                    const overrides = overrideCounts[feat.key];
                    return (
                      <Card key={feat.key} className={`transition-all ${platformEnabled ? "hover:shadow-md" : "opacity-50 border-dashed"}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{feat.name}</p>
                                <p className="text-[11px] text-muted-foreground">{feat.nameAr}</p>
                              </div>
                            </div>
                            {pf && (
                              <Switch
                                checked={platformEnabled}
                                onCheckedChange={(v) => togglePlatformFeature.mutate({ id: pf.id, enabled: v, feature_key: pf.feature_key })}
                              />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {feat.portals.map((p) => (
                              <Badge key={p} variant="secondary" className="text-[10px] h-5">
                                {p === "tenant" ? "بوابة الشركة" : p === "employee" ? "بوابة الموظف" : "بوابة المنصة"}
                              </Badge>
                            ))}
                            {pf?.is_beta && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-warning/40 text-warning bg-warning/5">BETA</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">الصفحات: {feat.navPaths.join(" • ")}</p>
                          {overrides && (
                            <div className="flex gap-2 text-[10px]">
                              {overrides.disabled > 0 && (
                                <span className="text-destructive flex items-center gap-0.5">
                                  <XCircle className="h-3 w-3" /> {overrides.disabled} معطّل بتجاوز
                                </span>
                              )}
                              {overrides.enabled > 0 && (
                                <span className="text-primary flex items-center gap-0.5">
                                  <CheckCircle className="h-3 w-3" /> {overrides.enabled} مفعّل بتجاوز
                                </span>
                              )}
                            </div>
                          )}
                          {!platformEnabled && (
                            <Badge variant="destructive" className="text-[9px]">معطّل على مستوى المنصة</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ===== TAB 3: TENANT SUBSCRIPTIONS ===== */}
        <TabsContent value="tenants" className="mt-4">
          <BPDataTable
            columns={tenantColumns}
            data={tenantSummary.slice((subsPage - 1) * 20, subsPage * 20)}
            emptyMessage="لا توجد اشتراكات نشطة"
            page={subsPage}
            pageSize={20}
            totalCount={tenantSummary.length}
            onPageChange={setSubsPage}
          />
        </TabsContent>

        {/* ===== TAB 4: FEATURE → PORTAL MAPPING ===== */}
        <TabsContent value="mapping" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">خريطة ربط الميزات بالبوابات</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الميزة</TableHead>
                    <TableHead className="text-right">المفتاح</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">البوابات</TableHead>
                    <TableHead className="text-right">الصفحات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FEATURE_PORTAL_MAP.map((entry) => {
                    const pf = platformFeatures.find((f) => f.feature_key === entry.key);
                    const enabled = pf?.enabled ?? true;
                    return (
                      <TableRow key={entry.key}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{entry.nameAr}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.name}</p>
                          </div>
                        </TableCell>
                        <TableCell><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{entry.key}</code></TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px]">{getCategoryLabel(entry.category).ar}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {entry.portals.map((p) => (
                              <Badge key={p} variant="secondary" className="text-[9px]">
                                {p === "tenant" ? "شركة" : p === "employee" ? "موظف" : "منصة"}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {entry.navPaths.map((np) => (
                              <code key={np} className="text-[9px] bg-muted/50 px-1 rounded">{np}</code>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {enabled ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
