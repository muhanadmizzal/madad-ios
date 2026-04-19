import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Layers, Package, Gift, Settings2, Crown, Zap, Plus, Pencil, Trash2,
  ToggleRight, DollarSign, Calendar, Clock, CheckCircle2, XCircle,
  Building2, Users, Shield, Eye, Timer, Sparkles,
} from "lucide-react";

// ======================== MODULES TAB ========================
function ModulesTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: modules = [] } = useQuery({
    queryKey: ["admin-madad-modules"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_modules").select("*").order("sort_order");
      return data || [];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("madad_modules").update({ is_global_enabled: enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-madad-modules"] });
      toast.success(t("تم التحديث", "Updated"));
    },
  });

  const MODULE_COLORS: Record<string, string> = {
    tamkeen: "hsl(221 78% 13%)",
    tathbeet: "hsl(31 26% 53%)",
    tahseel: "hsl(142 50% 40%)",
    takzeen: "hsl(270 50% 50%)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg">{t("إدارة الوحدات", "Module Management")}</h2>
          <p className="text-sm text-muted-foreground">{t("تفعيل أو تعطيل الوحدات على مستوى المنصة", "Enable or disable modules platform-wide")}</p>
        </div>
        <Badge variant="secondary">{modules.length} {t("وحدات", "modules")}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m: any) => (
          <Card key={m.id} className="border-border/50 overflow-hidden">
            <div className="h-1.5" style={{ background: MODULE_COLORS[m.key] || "hsl(var(--primary))" }} />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-heading font-bold" style={{ background: MODULE_COLORS[m.key] || "hsl(var(--primary))" }}>
                    {m.key?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold">{t(m.name_ar, m.name_en)}</h3>
                    <p className="text-xs text-muted-foreground">{t("المفتاح:", "Key:")} {m.key}</p>
                  </div>
                </div>
                <Badge className={m.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                  {m.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t(m.description_ar, m.description_en)}</p>
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("مفعّل على المنصة", "Platform Enabled")}</Label>
                <Switch
                  checked={m.is_global_enabled !== false}
                  onCheckedChange={(v) => toggleMut.mutate({ id: m.id, enabled: v })}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ======================== FEATURES TAB ========================
const PRICING_STATUS_STYLES: Record<string, { label_ar: string; label_en: string; cls: string; icon: typeof CheckCircle2 }> = {
  priced: { label_ar: "مسعّر", label_en: "Priced", cls: "bg-accent/10 text-accent", icon: DollarSign },
  free: { label_ar: "مجاني", label_en: "Free", cls: "bg-success/10 text-success", icon: CheckCircle2 },
  hidden: { label_ar: "مخفي", label_en: "Hidden", cls: "bg-muted text-muted-foreground", icon: Eye },
};

function FeaturesTab() {
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editFeature, setEditFeature] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: features = [] } = useQuery({
    queryKey: ["admin-feature-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_catalog").select("*").order("sort_order");
      return data || [];
    },
  });

  const filtered = features.filter((f: any) => {
    if (moduleFilter !== "all" && f.module_key !== moduleFilter) return false;
    if (statusFilter !== "all" && (f.pricing_status || "priced") !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(f.name || "").toLowerCase().includes(q) && !(f.name_ar || "").toLowerCase().includes(q) && !(f.key || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const saveMut = useMutation({
    mutationFn: async (f: any) => {
      const payload: any = {
        name: f.name, name_ar: f.name_ar, description: f.description, module_key: f.module_key,
        billing_type: f.billing_type, is_active: f.is_active, pricing_type: f.pricing_type,
        feature_type: f.feature_type || "feature",
        pricing_status: f.pricing_status || "priced",
        monthly_price: f.pricing_status === "free" || f.pricing_status === "hidden" ? 0 : Number(f.monthly_price),
        yearly_price: f.pricing_status === "free" || f.pricing_status === "hidden" ? 0 : Number(f.yearly_price),
        per_user_price: f.pricing_status === "free" || f.pricing_status === "hidden" ? 0 : Number(f.per_user_price || 0),
      };
      if (f.id) {
        const { error } = await supabase.from("feature_catalog").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feature_catalog").insert({ ...payload, key: f.key });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feature-catalog"] });
      toast.success(t("تم الحفظ", "Saved"));
      setShowForm(false);
      setEditFeature(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("feature_catalog").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-feature-catalog"] }),
  });

  const formatPrice = (p: number) => new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(p);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-heading font-bold text-lg">{t("كتالوج الميزات", "Feature Catalog")}</h2>
          <p className="text-sm text-muted-foreground">{t("إدارة الميزات والأسعار لكل وحدة", "Manage features and pricing per module")}</p>
        </div>
        <Button size="sm" onClick={() => { setEditFeature(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />{t("إضافة", "Add")}
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder={t("بحث...", "Search...")} value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("كل الوحدات", "All Modules")}</SelectItem>
            <SelectItem value="tamkeen">Tamkeen</SelectItem>
            <SelectItem value="tathbeet">Tathbeet</SelectItem>
            <SelectItem value="tahseel">Tahseel</SelectItem>
            <SelectItem value="takzeen">Takzeen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("كل الحالات", "All Statuses")}</SelectItem>
            <SelectItem value="priced">{t("مسعّر", "Priced")}</SelectItem>
            <SelectItem value="free">{t("مجاني", "Free")}</SelectItem>
            <SelectItem value="hidden">{t("مخفي", "Hidden")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.map((f: any) => {
          const ps = PRICING_STATUS_STYLES[f.pricing_status || "priced"];
          const PsIcon = ps.icon;
          return (
            <Card key={f.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-bold text-sm">{f.name_ar || f.name}</p>
                      <Badge variant="outline" className="text-[10px]">{f.module_key}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{f.feature_type || "feature"}</Badge>
                      <Badge className={`text-[10px] gap-1 ${ps.cls}`}>
                        <PsIcon className="h-3 w-3" />
                        {t(ps.label_ar, ps.label_en)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.key}
                      {f.pricing_status === "priced" && <> • {formatPrice(f.monthly_price)} {t("شهري", "mo")} • {formatPrice(f.yearly_price)} {t("سنوي", "yr")}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={f.is_active} onCheckedChange={(v) => toggleMut.mutate({ id: f.id, active: v })} />
                  <Button size="icon" variant="ghost" onClick={() => { setEditFeature(f); setShowForm(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">{t("لا توجد ميزات", "No features found")}</div>
        )}
      </div>

      <FeatureFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        feature={editFeature}
        onSave={(f: any) => saveMut.mutate(f)}
        saving={saveMut.isPending}
      />
    </div>
  );
}

function FeatureFormDialog({ open, onOpenChange, feature, onSave, saving }: any) {
  const { t } = useLanguage();
  const defaults = { key: "", name: "", name_ar: "", description: "", module_key: "tamkeen", monthly_price: 0, yearly_price: 0, billing_type: "monthly", pricing_type: "flat", per_user_price: 0, is_active: true, pricing_status: "priced", feature_type: "feature" };
  const [form, setForm] = useState<any>(feature || defaults);

  const handleOpen = () => { setForm(feature || defaults); };
  const isPriced = form.pricing_status === "priced";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>{feature ? t("تعديل ميزة", "Edit Feature") : t("إضافة ميزة", "Add Feature")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!feature && (
            <div><Label>{t("المفتاح", "Key")}</Label><Input value={form.key || ""} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="e.g. payroll" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("الاسم (EN)", "Name (EN)")}</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t("الاسم (AR)", "Name (AR)")}</Label><Input value={form.name_ar || ""} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
          </div>
          <div><Label>{t("الوصف", "Description")}</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("الوحدة", "Module")}</Label>
              <Select value={form.module_key || "tamkeen"} onValueChange={v => setForm({ ...form, module_key: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tamkeen">Tamkeen</SelectItem>
                  <SelectItem value="tathbeet">Tathbeet</SelectItem>
                  <SelectItem value="tahseel">Tahseel</SelectItem>
                  <SelectItem value="takzeen">Takzeen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("نوع الميزة", "Feature Type")}</Label>
              <Select value={form.feature_type || "feature"} onValueChange={v => setForm({ ...form, feature_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">{t("صفحة", "Page")}</SelectItem>
                  <SelectItem value="feature">{t("ميزة", "Feature")}</SelectItem>
                  <SelectItem value="action">{t("إجراء", "Action")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("حالة التسعير", "Pricing Status")}</Label>
            <Select value={form.pricing_status || "priced"} onValueChange={v => setForm({ ...form, pricing_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priced">{t("مسعّر", "Priced")}</SelectItem>
                <SelectItem value="free">{t("مجاني", "Free")}</SelectItem>
                <SelectItem value="hidden">{t("مخفي", "Hidden")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isPriced && (
            <>
              <div>
                <Label>{t("نوع الفوترة", "Billing Type")}</Label>
                <Select value={form.billing_type || "monthly"} onValueChange={v => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("شهري", "Monthly")}</SelectItem>
                    <SelectItem value="yearly">{t("سنوي", "Yearly")}</SelectItem>
                    <SelectItem value="one_time">{t("مرة واحدة", "One-time")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>{t("السعر الشهري", "Monthly")}</Label><Input type="number" value={form.monthly_price || 0} onChange={e => setForm({ ...form, monthly_price: e.target.value })} /></div>
                <div><Label>{t("السعر السنوي", "Yearly")}</Label><Input type="number" value={form.yearly_price || 0} onChange={e => setForm({ ...form, yearly_price: e.target.value })} /></div>
                <div><Label>{t("لكل مستخدم", "Per User")}</Label><Input type="number" value={form.per_user_price || 0} onChange={e => setForm({ ...form, per_user_price: e.target.value })} /></div>
              </div>
            </>
          )}
          {!isPriced && (
            <div className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
              {form.pricing_status === "free" ? t("هذه الميزة مجانية — لا يتم احتساب أي رسوم", "This feature is free — no charges apply") : t("هذه الميزة مخفية — لن تظهر للعملاء", "This feature is hidden — not visible to clients")}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <Label>{t("نشط", "Active")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("إلغاء", "Cancel")}</Button>
          <Button onClick={() => onSave({ ...form, id: feature?.id })} disabled={saving}>{t("حفظ", "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======================== PACKAGES TAB (REDESIGNED) ========================
const MODULE_LABELS: Record<string, { ar: string; en: string }> = {
  tamkeen: { ar: "تمكين", en: "Tamkeen" },
  tathbeet: { ar: "تثبيت", en: "Tathbeet" },
  tahseel: { ar: "تحصيل", en: "Tahseel" },
  takzeen: { ar: "تخزين", en: "Takzeen" },
};

function PackagesTab() {
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const [editPkg, setEditPkg] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-madad-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_packages").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: pkgFeatures = [] } = useQuery({
    queryKey: ["admin-package-catalog-features"],
    queryFn: async () => {
      const { data } = await supabase.from("package_catalog_features").select("*");
      return data || [];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("madad_packages").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-madad-packages"] }),
  });

  const formatPrice = (p: number) => new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(p);

  const getFeatureCount = (pkgId: string) => pkgFeatures.filter((pf: any) => pf.package_id === pkgId).length;
  const getModuleKeys = (pkgId: string) => [...new Set(pkgFeatures.filter((pf: any) => pf.package_id === pkgId).map((pf: any) => pf.module_key))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg">{t("إدارة الباقات", "Package Management")}</h2>
          <p className="text-sm text-muted-foreground">{t("باقات متعددة الوحدات مع ميزات من الكتالوج", "Cross-module packages with catalog features")}</p>
        </div>
        <Button size="sm" onClick={() => { setEditPkg(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />{t("باقة جديدة", "New Package")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg: any) => {
          const featureCount = getFeatureCount(pkg.id);
          const moduleKeys = getModuleKeys(pkg.id);
          return (
            <Card key={pkg.id} className={`border-border/50 relative ${pkg.is_popular ? "ring-2 ring-accent" : ""}`}>
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground gap-1"><Crown className="h-3 w-3" />{t("الأكثر شعبية", "Most Popular")}</Badge>
                </div>
              )}
              <CardContent className="p-5 space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg">{t(pkg.name_ar, pkg.name_en)}</h3>
                  <Switch checked={pkg.is_active} onCheckedChange={v => toggleMut.mutate({ id: pkg.id, active: v })} />
                </div>
                <p className="text-sm text-muted-foreground">{t(pkg.description_ar, pkg.description_en)}</p>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("شهري", "Monthly")}</span>
                    <span className="font-bold">{formatPrice(pkg.monthly_price)} {pkg.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("سنوي", "Yearly")}</span>
                    <span className="font-bold">{formatPrice(pkg.yearly_price)} {pkg.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("فترة التجربة", "Trial")}</span>
                    <span className="font-medium">{pkg.trial_duration_days || 14} {t("يوم", "days")}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {moduleKeys.map(mk => (
                      <Badge key={mk} variant="outline" className="text-[10px]">{t(MODULE_LABELS[mk]?.ar || mk, MODULE_LABELS[mk]?.en || mk)}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{featureCount} {t("ميزة مضمنة", "features included")}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setEditPkg(pkg); setShowForm(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />{t("تعديل", "Edit")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <PackageFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          pkg={editPkg}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-madad-packages"] });
            qc.invalidateQueries({ queryKey: ["admin-package-catalog-features"] });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function PackageFormDialog({ open, onOpenChange, pkg, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; pkg: any; onSaved: () => void }) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState(pkg || { key: "", name_ar: "", name_en: "", description_ar: "", description_en: "", monthly_price: 0, yearly_price: 0, trial_duration_days: 14, is_active: true, is_popular: false, currency: "IQD" });
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [activeModule, setActiveModule] = useState("tamkeen");

  // Load all priced/free features from catalog
  const { data: allFeatures = [] } = useQuery({
    queryKey: ["catalog-features-for-pkg"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_catalog").select("*").eq("is_active", true).in("pricing_status", ["priced", "free"]).order("module_key").order("sort_order");
      return data || [];
    },
  });

  // Load existing feature selections for this package
  const { data: existingPcf = [] } = useQuery({
    queryKey: ["pcf-for-pkg", pkg?.id],
    queryFn: async () => {
      if (!pkg?.id) return [];
      const { data } = await supabase.from("package_catalog_features").select("feature_id").eq("package_id", pkg.id);
      return data || [];
    },
    enabled: !!pkg?.id,
  });

  // Initialize selected features from existing data
  useState(() => {
    if (existingPcf.length > 0) {
      setSelectedFeatureIds(new Set(existingPcf.map((p: any) => p.feature_id)));
    }
  });

  // Update selection when existingPcf loads
  useMemo(() => {
    if (existingPcf.length > 0 && selectedFeatureIds.size === 0) {
      setSelectedFeatureIds(new Set(existingPcf.map((p: any) => p.feature_id)));
    }
  }, [existingPcf]);

  const featuresByModule = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const f of allFeatures) {
      const mk = f.module_key || "tamkeen";
      if (!grouped[mk]) grouped[mk] = [];
      grouped[mk].push(f);
    }
    return grouped;
  }, [allFeatures]);

  const modulesWithFeatures = Object.keys(featuresByModule);

  const toggleFeature = (featureId: string) => {
    setSelectedFeatureIds(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  };

  const toggleAllModule = (moduleKey: string) => {
    const moduleFeatures = featuresByModule[moduleKey] || [];
    const allSelected = moduleFeatures.every((f: any) => selectedFeatureIds.has(f.id));
    setSelectedFeatureIds(prev => {
      const next = new Set(prev);
      for (const f of moduleFeatures) {
        if (allSelected) next.delete(f.id);
        else next.add(f.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name_ar: form.name_ar, name_en: form.name_en, description_ar: form.description_ar,
        description_en: form.description_en, monthly_price: Number(form.monthly_price),
        yearly_price: Number(form.yearly_price), is_active: form.is_active,
        is_popular: form.is_popular, currency: form.currency || "IQD",
        trial_duration_days: Number(form.trial_duration_days || 14),
      };

      let pkgId = pkg?.id;
      if (pkgId) {
        const { error } = await supabase.from("madad_packages").update(payload).eq("id", pkgId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("madad_packages").insert({ ...payload, key: form.key }).select("id").single();
        if (error) throw error;
        pkgId = data.id;
      }

      // Sync features: delete all then re-insert
      await supabase.from("package_catalog_features").delete().eq("package_id", pkgId);

      const selectedFeatures = allFeatures.filter((f: any) => selectedFeatureIds.has(f.id));
      if (selectedFeatures.length > 0) {
        const rows = selectedFeatures.map((f: any) => ({
          package_id: pkgId,
          feature_id: f.id,
          feature_key: f.key,
          module_key: f.module_key || "tamkeen",
        }));
        const { error } = await supabase.from("package_catalog_features").insert(rows);
        if (error) throw error;
      }

      toast.success(t("تم الحفظ", "Saved"));
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedFeatureIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{pkg ? t("تعديل الباقة", "Edit Package") : t("باقة جديدة", "New Package")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid gap-4 pb-4">
            {/* Basic info */}
            {!pkg && <div><Label>{t("المفتاح", "Key")}</Label><Input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="e.g. pro" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("الاسم (AR)", "Name (AR)")}</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
              <div><Label>{t("الاسم (EN)", "Name (EN)")}</Label><Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("الوصف (AR)", "Desc (AR)")}</Label><Textarea value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} rows={2} /></div>
              <div><Label>{t("الوصف (EN)", "Desc (EN)")}</Label><Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={2} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t("شهري", "Monthly")}</Label><Input type="number" value={form.monthly_price} onChange={e => setForm({ ...form, monthly_price: e.target.value })} /></div>
              <div><Label>{t("سنوي", "Yearly")}</Label><Input type="number" value={form.yearly_price} onChange={e => setForm({ ...form, yearly_price: e.target.value })} /></div>
              <div><Label>{t("تجربة (أيام)", "Trial (days)")}</Label><Input type="number" value={form.trial_duration_days} onChange={e => setForm({ ...form, trial_duration_days: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>{t("نشط", "Active")}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={v => setForm({ ...form, is_popular: v })} /><Label>{t("شائع", "Popular")}</Label></div>
            </div>

            <Separator />

            {/* Feature picker */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm">{t("اختر الميزات من الكتالوج", "Select Features from Catalog")}</h3>
                <Badge variant="secondary">{selectedCount} {t("مختارة", "selected")}</Badge>
              </div>

              {/* Module tabs */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {modulesWithFeatures.map(mk => {
                  const moduleSelected = (featuresByModule[mk] || []).filter((f: any) => selectedFeatureIds.has(f.id)).length;
                  const moduleTotal = (featuresByModule[mk] || []).length;
                  return (
                    <Button
                      key={mk}
                      variant={activeModule === mk ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setActiveModule(mk)}
                    >
                      {t(MODULE_LABELS[mk]?.ar || mk, MODULE_LABELS[mk]?.en || mk)}
                      <Badge variant="secondary" className="text-[10px] ml-1">{moduleSelected}/{moduleTotal}</Badge>
                    </Button>
                  );
                })}
              </div>

              {/* Feature list for active module */}
              <div className="border border-border rounded-lg p-3 space-y-1 max-h-52 overflow-y-auto">
                {(featuresByModule[activeModule] || []).length > 0 && (
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50 mb-2">
                    <Checkbox
                      checked={(featuresByModule[activeModule] || []).every((f: any) => selectedFeatureIds.has(f.id))}
                      onCheckedChange={() => toggleAllModule(activeModule)}
                    />
                    <Label className="text-xs font-medium cursor-pointer">{t("تحديد الكل", "Select All")}</Label>
                  </div>
                )}
                {(featuresByModule[activeModule] || []).map((f: any) => {
                  const ps = PRICING_STATUS_STYLES[f.pricing_status || "priced"];
                  return (
                    <div key={f.id} className="flex items-center gap-2 py-1.5 hover:bg-muted/30 rounded px-1 cursor-pointer" onClick={() => toggleFeature(f.id)}>
                      <Checkbox checked={selectedFeatureIds.has(f.id)} onCheckedChange={() => toggleFeature(f.id)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{t(f.name_ar || f.name, f.name)}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{f.key}</span>
                      </div>
                      <Badge className={`text-[10px] ${ps.cls}`}>{t(ps.label_ar, ps.label_en)}</Badge>
                    </div>
                  );
                })}
                {(featuresByModule[activeModule] || []).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">{t("لا توجد ميزات لهذه الوحدة", "No features for this module")}</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("إلغاء", "Cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "..." : t("حفظ الباقة", "Save Package")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======================== OFFERS TAB (REDESIGNED) ========================
const OFFER_TYPES = [
  { value: "discount", label_ar: "خصم", label_en: "Discount", icon: DollarSign, desc_ar: "خصم نسبة أو مبلغ ثابت", desc_en: "Percentage or fixed amount discount" },
  { value: "subscription_bonus", label_ar: "مكافأة اشتراك", label_en: "Subscription Bonus", icon: Calendar, desc_ar: "اشترِ X أشهر واحصل على Y مجاناً", desc_en: "Buy X months get Y free" },
  { value: "feature_bonus", label_ar: "ميزات إضافية", label_en: "Feature Bonus", icon: Zap, desc_ar: "إضافة ميزات مجانية مع الباقة", desc_en: "Add free features with the package" },
  { value: "conditional", label_ar: "عرض مشروط", label_en: "Conditional", icon: Shield, desc_ar: "خصم بناءً على شرط معيّن", desc_en: "Discount based on a condition" },
];

function OffersTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [editOffer, setEditOffer] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: offers = [] } = useQuery({
    queryKey: ["admin-madad-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_offers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-madad-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_packages").select("id, name_ar, name_en, key");
      return data || [];
    },
  });

  const getPackageName = (id: string) => {
    const p = packages.find((pk: any) => pk.id === id);
    return p ? t(p.name_ar, p.name_en) : id.slice(0, 8);
  };

  const getOfferType = (type: string) => OFFER_TYPES.find(ot => ot.value === type) || OFFER_TYPES[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg">{t("محرك العروض", "Offer Engine")}</h2>
          <p className="text-sm text-muted-foreground">{t("عروض مرنة: خصومات، مكافآت اشتراك، ميزات إضافية، عروض مشروطة", "Flexible offers: discounts, subscription bonuses, feature bonuses, conditional offers")}</p>
        </div>
        <Button size="sm" onClick={() => { setEditOffer(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />{t("عرض جديد", "New Offer")}
        </Button>
      </div>

      {/* Offer type legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {OFFER_TYPES.map(ot => {
          const Icon = ot.icon;
          return (
            <div key={ot.value} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/20">
              <Icon className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-xs font-medium">{t(ot.label_ar, ot.label_en)}</p>
                <p className="text-[10px] text-muted-foreground">{t(ot.desc_ar, ot.desc_en)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((o: any) => {
          const ot = getOfferType(o.offer_type || "discount");
          const OtIcon = ot.icon;
          const appliedPkgs = (o.apply_to_packages || []) as string[];
          return (
            <Card key={o.id} className="border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <OtIcon className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm">{t(o.title_ar, o.title_en)}</h3>
                      <Badge variant="outline" className="text-[10px]">{t(ot.label_ar, ot.label_en)}</Badge>
                    </div>
                  </div>
                  <Badge className={o.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                    {o.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t(o.description_ar, o.description_en)}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {o.offer_type === "discount" && <span className="font-medium">{o.discount_type === "percentage" ? `${o.discount_value}%` : `${o.discount_value} IQD`} {t("خصم", "off")}</span>}
                  {o.offer_type === "subscription_bonus" && <span className="font-medium">{t("مكافأة:", "Bonus:")} {o.bonus_months} {t("أشهر مجانية", "free months")}</span>}
                  {o.offer_type === "feature_bonus" && <span className="font-medium">{(o.bonus_feature_keys || []).length} {t("ميزات إضافية", "bonus features")}</span>}
                  {o.offer_type === "conditional" && <span className="font-medium">{t("شرط:", "Condition:")} {o.condition_type} = {o.condition_value}</span>}
                  {o.expires_at && <span>• {t("ينتهي:", "Expires:")} {new Date(o.expires_at).toLocaleDateString()}</span>}
                </div>
                {appliedPkgs.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{t("يطبق على:", "Applies to:")}</span>
                    {appliedPkgs.map(pid => (
                      <Badge key={pid} variant="secondary" className="text-[10px]">{getPackageName(pid)}</Badge>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setEditOffer(o); setShowForm(true); }}>
                  <Pencil className="h-3 w-3 mr-1" />{t("تعديل", "Edit")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {offers.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">{t("لا توجد عروض", "No offers yet")}</div>
        )}
      </div>

      {showForm && (
        <OfferFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          offer={editOffer}
          packages={packages}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-madad-offers"] });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function OfferFormDialog({ open, onOpenChange, offer, packages, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; offer: any; packages: any[]; onSaved: () => void }) {
  const { t } = useLanguage();
  const defaults = {
    title_ar: "", title_en: "", description_ar: "", description_en: "",
    offer_type: "discount", discount_type: "percentage", discount_value: 0,
    is_active: true, starts_at: "", expires_at: "",
    apply_to_packages: [] as string[],
    bonus_months: 0, bonus_feature_keys: [] as string[],
    condition_type: "billing_period", condition_value: "",
    min_billing_cycle: "",
    badge_ar: "", badge_en: "",
  };
  const [form, setForm] = useState<any>(offer || defaults);
  const [saving, setSaving] = useState(false);

  // Load features for feature_bonus type
  const { data: catalogFeatures = [] } = useQuery({
    queryKey: ["catalog-features-for-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_catalog").select("key, name, name_ar, module_key").eq("is_active", true).in("pricing_status", ["priced", "free"]);
      return data || [];
    },
  });

  const togglePackage = (pkgId: string) => {
    const current = form.apply_to_packages || [];
    const next = current.includes(pkgId) ? current.filter((id: string) => id !== pkgId) : [...current, pkgId];
    setForm({ ...form, apply_to_packages: next });
  };

  const toggleBonusFeature = (key: string) => {
    const current = form.bonus_feature_keys || [];
    const next = current.includes(key) ? current.filter((k: string) => k !== key) : [...current, key];
    setForm({ ...form, bonus_feature_keys: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title_ar: form.title_ar, title_en: form.title_en,
        description_ar: form.description_ar, description_en: form.description_en,
        offer_type: form.offer_type, discount_type: form.discount_type,
        discount_value: Number(form.discount_value), is_active: form.is_active,
        starts_at: form.starts_at || null, expires_at: form.expires_at || null,
        apply_to_packages: form.apply_to_packages || [],
        bonus_months: Number(form.bonus_months || 0),
        bonus_feature_keys: form.bonus_feature_keys || [],
        condition_type: form.condition_type || null,
        condition_value: form.condition_value || null,
        min_billing_cycle: form.min_billing_cycle || null,
        badge_ar: form.badge_ar || null, badge_en: form.badge_en || null,
      };
      if (form.id) {
        const { error } = await supabase.from("madad_offers").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("madad_offers").insert(payload);
        if (error) throw error;
      }
      toast.success(t("تم الحفظ", "Saved"));
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{offer ? t("تعديل العرض", "Edit Offer") : t("عرض جديد", "New Offer")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid gap-4 pb-4">
            {/* Offer type selector */}
            <div>
              <Label className="mb-2 block">{t("نوع العرض", "Offer Type")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {OFFER_TYPES.map(ot => {
                  const Icon = ot.icon;
                  const isSelected = form.offer_type === ot.value;
                  return (
                    <div
                      key={ot.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border/50 hover:border-border"}`}
                      onClick={() => setForm({ ...form, offer_type: ot.value })}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium">{t(ot.label_ar, ot.label_en)}</p>
                        <p className="text-[10px] text-muted-foreground">{t(ot.desc_ar, ot.desc_en)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Title & description */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("العنوان (AR)", "Title (AR)")}</Label><Input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} /></div>
              <div><Label>{t("العنوان (EN)", "Title (EN)")}</Label><Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("الوصف (AR)", "Desc (AR)")}</Label><Textarea value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} rows={2} /></div>
              <div><Label>{t("الوصف (EN)", "Desc (EN)")}</Label><Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} rows={2} /></div>
            </div>

            {/* Type-specific fields */}
            {form.offer_type === "discount" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("نوع الخصم", "Discount Type")}</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("نسبة مئوية", "Percentage")}</SelectItem>
                      <SelectItem value="fixed">{t("مبلغ ثابت", "Fixed Amount")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t("القيمة", "Value")}</Label><Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} /></div>
              </div>
            )}

            {form.offer_type === "subscription_bonus" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("أشهر مجانية", "Bonus Months")}</Label><Input type="number" value={form.bonus_months} onChange={e => setForm({ ...form, bonus_months: e.target.value })} /></div>
                <div>
                  <Label>{t("الحد الأدنى لدورة الفوترة", "Min Billing Cycle")}</Label>
                  <Select value={form.min_billing_cycle || ""} onValueChange={v => setForm({ ...form, min_billing_cycle: v })}>
                    <SelectTrigger><SelectValue placeholder={t("اختياري", "Optional")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t("شهري", "Monthly")}</SelectItem>
                      <SelectItem value="yearly">{t("سنوي", "Yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.offer_type === "feature_bonus" && (
              <div>
                <Label className="mb-2 block">{t("الميزات الإضافية المجانية", "Bonus Features (Free)")}</Label>
                <div className="border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {catalogFeatures.map((f: any) => (
                    <div key={f.key} className="flex items-center gap-2 py-1 hover:bg-muted/30 rounded px-1 cursor-pointer" onClick={() => toggleBonusFeature(f.key)}>
                      <Checkbox checked={(form.bonus_feature_keys || []).includes(f.key)} onCheckedChange={() => toggleBonusFeature(f.key)} />
                      <span className="text-sm">{t(f.name_ar || f.name, f.name)}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{f.module_key}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.offer_type === "conditional" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("نوع الشرط", "Condition Type")}</Label>
                  <Select value={form.condition_type || "billing_period"} onValueChange={v => setForm({ ...form, condition_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="billing_period">{t("دورة الفوترة", "Billing Period")}</SelectItem>
                      <SelectItem value="module_count">{t("عدد الوحدات", "Module Count")}</SelectItem>
                      <SelectItem value="user_count">{t("عدد المستخدمين", "User Count")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t("قيمة الشرط", "Condition Value")}</Label><Input value={form.condition_value || ""} onChange={e => setForm({ ...form, condition_value: e.target.value })} placeholder={t("مثال: yearly أو 3", "e.g. yearly or 3")} /></div>
                <div>
                  <Label>{t("نوع الخصم", "Discount Type")}</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("نسبة مئوية", "Percentage")}</SelectItem>
                      <SelectItem value="fixed">{t("مبلغ ثابت", "Fixed Amount")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t("قيمة الخصم", "Discount Value")}</Label><Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} /></div>
              </div>
            )}

            <Separator />

            {/* Apply to packages */}
            <div>
              <Label className="mb-2 block">{t("تطبيق على الباقات", "Apply to Packages")}</Label>
              <div className="flex flex-wrap gap-2">
                {packages.map((pkg: any) => {
                  const isSelected = (form.apply_to_packages || []).includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-accent bg-accent/5" : "border-border/50"}`}
                      onClick={() => togglePackage(pkg.id)}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => togglePackage(pkg.id)} />
                      <span className="text-sm font-medium">{t(pkg.name_ar, pkg.name_en)}</span>
                    </div>
                  );
                })}
                {packages.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد باقات", "No packages")}</p>}
              </div>
            </div>

            {/* Dates & status */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("تاريخ البدء", "Start Date")}</Label><Input type="date" value={form.starts_at?.split("T")[0] || ""} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>{t("تاريخ الانتهاء", "End Date")}</Label><Input type="date" value={form.expires_at?.split("T")[0] || ""} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>{t("نشط", "Active")}</Label>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("إلغاء", "Cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "..." : t("حفظ العرض", "Save Offer")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======================== TRIAL CONFIG TAB ========================
function TrialConfigTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["madad-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_platform_settings").select("*");
      return data || [];
    },
  });

  const getSetting = (key: string) => {
    const s = settings.find((s: any) => s.key === key);
    return s?.value;
  };

  const updateMut = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase.from("madad_platform_settings").update({ value: JSON.stringify(value), updated_at: new Date().toISOString() }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["madad-platform-settings"] });
      toast.success(t("تم التحديث", "Updated"));
    },
  });

  const rawTrialDays = getSetting("default_trial_days");
  const trialDays = typeof rawTrialDays === "string" ? parseInt(rawTrialDays) : (typeof rawTrialDays === "number" ? rawTrialDays : 14);
  const autoTrial = getSetting("auto_trial_on_register") === true || getSetting("auto_trial_on_register") === "true";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">{t("إعدادات الفترة التجريبية", "Trial Configuration")}</h2>
        <p className="text-sm text-muted-foreground">{t("تحكم في إعدادات التجربة الافتراضية للمستأجرين الجدد", "Control default trial settings for new tenants")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-accent" />
              <h3 className="font-heading font-bold">{t("مدة التجربة الافتراضية", "Default Trial Duration")}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Input type="number" value={String(trialDays)} onChange={e => updateMut.mutate({ key: "default_trial_days", value: parseInt(e.target.value) || 14 })} className="w-24" />
              <span className="text-sm text-muted-foreground">{t("يوم", "days")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="font-heading font-bold">{t("تفعيل تلقائي للتجربة", "Auto-Start Trial")}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={autoTrial} onCheckedChange={v => updateMut.mutate({ key: "auto_trial_on_register", value: v })} />
              <span className="text-sm text-muted-foreground">{t("تفعيل التجربة تلقائياً عند تسجيل مستأجر جديد", "Automatically start trial when a new tenant registers")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-heading font-bold">{t("وحدات التجربة المجانية", "Trial Modules")}</h3>
          <p className="text-sm text-muted-foreground">{t("يتم تحديد وحدات التجربة من خلال إعدادات كل باقة (تبويب الباقات)", "Trial modules are configured per package in the Packages tab")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ======================== SUBSCRIPTIONS TAB ========================
function SubscriptionsTab() {
  const { t } = useLanguage();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-madad-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_tenant_subscriptions").select("*, companies(name, name_ar, status), madad_packages(name_ar, name_en, key)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const statusStyles: Record<string, string> = {
    active: "bg-success/10 text-success",
    trial: "bg-info/10 text-info",
    expired: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg">{t("الاشتراكات", "Subscriptions")}</h2>
          <p className="text-sm text-muted-foreground">{t("عرض جميع اشتراكات العملاء", "View all tenant subscriptions")}</p>
        </div>
        <Badge variant="secondary">{subscriptions.length}</Badge>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t("لا توجد اشتراكات", "No subscriptions yet")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {subscriptions.map((sub: any) => (
            <Card key={sub.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">{sub.companies?.name_ar || sub.companies?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(sub.madad_packages?.name_ar, sub.madad_packages?.name_en)} • {sub.billing_cycle}
                        {sub.trial_ends_at && (
                          <span> • {t("التجربة تنتهي:", "Trial ends:")} {new Date(sub.trial_ends_at).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusStyles[sub.status] || "bg-muted text-muted-foreground"}>{sub.status}</Badge>
                    {sub.start_date && <span className="text-xs text-muted-foreground">{sub.start_date}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================== MAIN PAGE ========================
export default function BPPricingEngine() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-accent" />
          {t("محرك التسعير والاشتراكات", "Pricing & Subscription Engine")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("لوحة تحكم شاملة لإدارة الوحدات والميزات والباقات والعروض والتجربة المجانية", "Complete control panel for modules, features, packages, offers, and trial configuration")}</p>
      </div>

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="modules" className="gap-1.5"><Layers className="h-3.5 w-3.5" />{t("الوحدات", "Modules")}</TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5"><Zap className="h-3.5 w-3.5" />{t("الميزات", "Features")}</TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5"><Package className="h-3.5 w-3.5" />{t("الباقات", "Packages")}</TabsTrigger>
          <TabsTrigger value="offers" className="gap-1.5"><Gift className="h-3.5 w-3.5" />{t("العروض", "Offers")}</TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5"><Timer className="h-3.5 w-3.5" />{t("التجربة", "Trial")}</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5"><Crown className="h-3.5 w-3.5" />{t("الاشتراكات", "Subscriptions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="features"><FeaturesTab /></TabsContent>
        <TabsContent value="packages"><PackagesTab /></TabsContent>
        <TabsContent value="offers"><OffersTab /></TabsContent>
        <TabsContent value="trial"><TrialConfigTab /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
