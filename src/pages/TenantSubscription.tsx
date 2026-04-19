import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useFeatureCatalog, useTenantFeatures, useBasketBill, useToggleFeature, useFeatureRequests } from "@/hooks/useFeatureCatalog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShoppingCart, Users, Clock, CalendarDays, Wallet, Briefcase, Target,
  GraduationCap, FileText, GitBranch, MapPin, BarChart3, CheckSquare,
  Zap, Bot, Sparkles, Brain, Search, Lightbulb, Shield, ClipboardCheck,
  Receipt, FolderKanban, ShoppingBag, CreditCard, Send, XCircle, CheckCircle2,
  Loader2, AlertCircle,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  users: Users, clock: Clock, "calendar-days": CalendarDays, wallet: Wallet,
  briefcase: Briefcase, target: Target, "graduation-cap": GraduationCap,
  "file-text": FileText, "git-branch": GitBranch, "map-pin": MapPin,
  "bar-chart-3": BarChart3, "check-square": CheckSquare, zap: Zap, bot: Bot,
  sparkles: Sparkles, brain: Brain, search: Search, lightbulb: Lightbulb,
  shield: Shield, "clipboard-check": ClipboardCheck, receipt: Receipt,
  "folder-kanban": FolderKanban,
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  core: { label: "أساسي", color: "bg-primary/10 text-primary" },
  hr: { label: "موارد بشرية", color: "bg-blue-500/10 text-blue-600" },
  admin: { label: "إداري", color: "bg-amber-500/10 text-amber-600" },
  analytics: { label: "تحليلات", color: "bg-emerald-500/10 text-emerald-600" },
  ai: { label: "ذكاء اصطناعي", color: "bg-violet-500/10 text-violet-600" },
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  approved: { label: "تمت الموافقة", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
  cancelled: { label: "ملغي", variant: "outline" },
};

export default function TenantSubscription() {
  const { companyId } = useCompany();
  const { data: catalog = [], isLoading: catLoading } = useFeatureCatalog();
  const { data: tenantFeatures = [], isLoading: tfLoading } = useTenantFeatures();
  const { data: bill, isLoading: billLoading } = useBasketBill();
  const { data: requests = [] } = useFeatureRequests();
  const { requestFeature, cancelRequest } = useToggleFeature();
  const [filter, setFilter] = useState<string>("all");
  const [payDialog, setPayDialog] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices = [] } = useQuery({
    queryKey: ["tenant-invoices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("billing_invoices").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Submit payment confirmation
  const submitPayment = useMutation({
    mutationFn: async (form: FormData) => {
      const inv = payDialog;
      if (!inv) throw new Error("No invoice");
      const { error } = await supabase.from("billing_invoices").update({
        payment_status: "submitted",
        payment_method: (form.get("payment_method") as string) || "bank_transfer",
        payment_reference: (form.get("payment_reference") as string) || null,
        notes: (form.get("notes") as string) || inv.notes,
      }).eq("id", inv.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invoices"] });
      toast({ title: "تم إرسال تأكيد الدفع", description: "سيتم مراجعته من قبل الإدارة" });
      setPayDialog(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (catLoading || tfLoading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    );
  }

  const activeFeatureKeys = new Set(
    tenantFeatures.filter(tf => tf.status === "active").map(tf => tf.feature_key)
  );

  const pendingRequestKeys = new Set(
    requests.filter(r => r.status === "pending").map(r => r.feature_key)
  );

  const categories = [...new Set(catalog.map(c => c.category))];
  const filteredCatalog = filter === "all" ? catalog : catalog.filter(c => c.category === filter);

  const activeCount = activeFeatureKeys.size;
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const totalMonthly = bill?.total || 0;
  const empCount = bill?.employee_count || 0;

  const isRequesting = requestFeature.isPending || cancelRequest.isPending;

  const handleRequest = (key: string, currentlyActive: boolean) => {
    const item = catalog.find(c => c.key === key);
    const impact = item ? (item.pricing_type === "per_user" ? item.per_user_price * empCount : item.monthly_price) : 0;
    requestFeature.mutate({
      featureKey: key,
      action: currentlyActive ? "deactivate" : "activate",
      estimatedImpact: impact,
      moduleKey: (item as any)?.module_key || undefined,
    });
  };

  const getFeaturePrice = (item: typeof catalog[0]) => {
    if (item.pricing_type === "per_user") {
      return { label: `$${item.per_user_price}/موظف`, total: item.per_user_price * empCount };
    }
    return { label: `$${item.monthly_price}/شهر`, total: item.monthly_price };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          اختر ميزاتك
        </h1>
        <p className="text-sm text-muted-foreground mt-1">اختر الميزات التي تحتاجها — أرسل طلبك وسيتم مراجعته</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الميزات المفعّلة</p>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">طلبات معلقة</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الموظفون النشطون</p>
                <p className="text-2xl font-bold text-foreground">{empCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الفاتورة الشهرية</p>
                <p className="text-2xl font-bold text-primary">
                  {billLoading ? "..." : `$${totalMonthly.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">
            <ShoppingCart className="h-3.5 w-3.5 ml-1" />
            كتالوج الميزات
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Send className="h-3.5 w-3.5 ml-1" />
            طلباتي ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="basket">
            <ShoppingBag className="h-3.5 w-3.5 ml-1" />
            سلتي ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="h-3.5 w-3.5 ml-1" />
            الفواتير
          </TabsTrigger>
        </TabsList>

        {/* ===== CATALOG ===== */}
        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilter("all")}>
              الكل ({catalog.length})
            </Button>
            {categories.map(cat => {
              const catInfo = CATEGORY_LABELS[cat] || { label: cat, color: "" };
              const count = catalog.filter(c => c.category === cat).length;
              return (
                <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilter(cat)}>
                  {catInfo.label} ({count})
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map(item => {
              const isActive = activeFeatureKeys.has(item.key);
              const isPending = pendingRequestKeys.has(item.key);
              const Icon = ICON_MAP[item.icon] || Zap;
              const price = getFeaturePrice(item);
              const catInfo = CATEGORY_LABELS[item.category] || { label: item.category, color: "bg-muted text-muted-foreground" };

              return (
                <Card
                  key={item.key}
                  className={`relative transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-primary shadow-sm bg-primary/[0.02]"
                      : isPending
                      ? "ring-1 ring-amber-400 bg-amber-50/30"
                      : "hover:shadow-md hover:border-primary/30"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? "bg-primary/15" : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{item.name_ar}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className={`text-[9px] ${catInfo.color}`}>{catInfo.label}</Badge>
                            {isActive && <Badge className="text-[9px] bg-primary/10 text-primary border-0">مفعّل</Badge>}
                            {isPending && <Badge className="text-[9px] bg-amber-100 text-amber-700 border-0">طلب معلق</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isActive ? "outline" : isPending ? "secondary" : "default"}
                        className="text-xs h-8"
                        onClick={() => handleRequest(item.key, isActive)}
                        disabled={isRequesting || isPending}
                      >
                        {isPending ? (
                          <><Loader2 className="h-3 w-3 ml-1 animate-spin" />معلق</>
                        ) : isActive ? (
                          <><XCircle className="h-3 w-3 ml-1" />طلب إلغاء</>
                        ) : (
                          <><Send className="h-3 w-3 ml-1" />طلب تفعيل</>
                        )}
                      </Button>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {item.pricing_type === "per_user" ? "لكل موظف" : "سعر ثابت"}
                      </span>
                      <div className="text-left">
                        <span className="font-bold text-sm text-foreground">{price.label}</span>
                        {item.pricing_type === "per_user" && empCount > 0 && (
                          <p className="text-[10px] text-muted-foreground">≈ ${price.total}/شهر</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== REQUESTS ===== */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-5 w-5 text-primary" />طلبات تغيير الميزات</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الميزة</TableHead>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>التأثير الشهري</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => {
                    const feature = catalog.find(c => c.key === req.feature_key);
                    const st = STATUS_MAP[req.status] || STATUS_MAP.pending;
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium text-sm">{feature?.name_ar || req.feature_key}</TableCell>
                        <TableCell>
                          <Badge variant={req.action === "activate" ? "default" : "destructive"} className="text-[10px]">
                            {req.action === "activate" ? "تفعيل" : "إلغاء"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {req.action === "activate" ? "+" : "-"}${Number(req.estimated_monthly_impact).toLocaleString()}
                        </TableCell>
                        <TableCell><Badge variant={st.variant} className="text-[10px]">{st.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-xs">{new Date(req.created_at).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => cancelRequest.mutate(req.id)} disabled={cancelRequest.isPending}>
                              إلغاء الطلب
                            </Button>
                          )}
                          {req.review_notes && (
                            <p className="text-[10px] text-muted-foreground mt-1">{req.review_notes}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        لا توجد طلبات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BASKET / BILL ===== */}
        <TabsContent value="basket" className="space-y-4 mt-4">
          {(!bill || bill.items.length === 0) ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">لم تختر أي ميزات بعد</p>
                <p className="text-xs text-muted-foreground mt-1">اذهب لكتالوج الميزات وأرسل طلب تفعيل</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  تفاصيل الفاتورة الشهرية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {bill.items.map((item, i) => {
                    const catInfo = CATEGORY_LABELS[item.category] || { label: item.category, color: "" };
                    return (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-[9px] ${catInfo.color}`}>{catInfo.label}</Badge>
                          <div>
                            <span className="text-sm text-foreground">{item.description}</span>
                            {item.pricing_type === "per_user" && (
                              <p className="text-[10px] text-muted-foreground">${item.unit_price} × {item.quantity} موظف</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground tabular-nums">${item.amount.toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive"
                            onClick={() => handleRequest(item.feature_key, true)}
                            disabled={isRequesting}
                          >
                            طلب إلغاء
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-border">
                  <span className="text-lg font-bold text-foreground">الإجمالي الشهري</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">${bill.total.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  بناءً على {bill.employee_count} موظف نشط • العملة: {bill.currency}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== INVOICES ===== */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الفواتير</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>الفترة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => {
                    const ps = (inv as any).payment_status || "unpaid";
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.billing_period || "—"}</TableCell>
                        <TableCell className="font-semibold">${Number(inv.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>
                            {inv.status === "paid" ? "مدفوعة" : inv.status === "overdue" ? "متأخرة" : "معلقة"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${
                            ps === "confirmed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            ps === "submitted" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            ps === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {ps === "unpaid" ? "غير مدفوعة" : ps === "submitted" ? "قيد المراجعة" : ps === "confirmed" ? "مؤكدة" : ps === "rejected" ? "مرفوضة" : ps}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(inv.due_date).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>
                          {inv.status !== "paid" && (ps === "unpaid" || ps === "rejected") && (
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setPayDialog(inv)}>
                              <CreditCard className="h-3 w-3" />تأكيد الدفع
                            </Button>
                          )}
                          {ps === "submitted" && (
                            <span className="text-[10px] text-amber-600">بانتظار المراجعة</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Payment Confirmation Dialog ═══ */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الدفع — {payDialog?.invoice_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitPayment.mutate(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/30 border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">المبلغ المطلوب</p>
                <p className="text-2xl font-bold text-primary">${payDialog ? Number(payDialog.amount).toLocaleString() : 0}</p>
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select name="payment_method" defaultValue="bank_transfer">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="online">إلكتروني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم المرجع / الإيصال</Label>
                <Input name="payment_reference" placeholder="رقم الحوالة أو الإيصال" />
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea name="notes" rows={2} placeholder="أي تفاصيل إضافية..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setPayDialog(null)}>إلغاء</Button>
              <Button type="submit" disabled={submitPayment.isPending}>
                {submitPayment.isPending ? "جاري..." : "إرسال تأكيد الدفع"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
