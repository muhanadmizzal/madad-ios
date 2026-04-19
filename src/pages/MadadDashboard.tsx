import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/hooks/useRole";
import { useCompany } from "@/hooks/useCompany";
import { useMadadSubscription, useMadadDashboardStats } from "@/hooks/useMadadSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ALL_MODULES, MODULE_REGISTRY } from "@/lib/moduleConfig";
import {
  Bell, Activity, ArrowLeft, ArrowRight, CreditCard, Layers, Shield,
  Users, CalendarCheck, Building2, TrendingUp, AlertTriangle, Clock,
  CheckCircle2, XCircle, BarChart3, Zap, Crown, ExternalLink, Lock,
} from "lucide-react";
import { HybridAccessSummaryCard } from "@/components/madad/HybridAccessSummaryCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const ALL_MODULE_KEYS = ["tamkeen", "tathbeet", "takzeen", "tahseel"];

const TABLE_LABELS: Record<string, string> = {
  employees: "الموظفون", departments: "الأقسام", leave_requests: "الإجازات",
  attendance_records: "الحضور", tathbeet_bookings: "الحجوزات", audit_logs: "المراجعة",
  approval_requests: "الموافقات", payroll_runs: "الرواتب",
};
const ACTION_LABELS: Record<string, { ar: string; color: string }> = {
  INSERT: { ar: "إضافة", color: "text-success" },
  UPDATE: { ar: "تعديل", color: "text-info" },
  DELETE: { ar: "حذف", color: "text-destructive" },
};

export default function MadadDashboard() {
  const { t, lang } = useLanguage();
  const { canAccessBusinessPortal } = useRole();
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const { subscription, isActive, isTrial, isModuleActive, activeModuleKeys } = useMadadSubscription();
  const { data: stats } = useMadadDashboardStats();

  const { data: companyData } = useQuery({
    queryKey: ["company-name", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("name, name_ar").eq("id", companyId).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["madad-notifs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("notifications").select("id, title, message, type, created_at, is_read").eq("company_id", companyId).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

  const companyName = companyData?.name_ar || companyData?.name || "";
  const planName = subscription.package ? t(subscription.package.name_ar, subscription.package.name_en) : t("بدون اشتراك", "No Plan");
  const monthlyPrice = subscription.package?.monthly_price || 0;
  const currency = subscription.package?.currency || "USD";
  const renewalDate = subscription.end_date ? format(new Date(subscription.end_date), "yyyy/MM/dd") : "—";
  const daysLeft = subscription.end_date ? Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="space-y-8">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground">
              {t("مركز التحكم", "Control Center")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {companyName && <span className="font-medium text-foreground">{companyName}</span>}
              {companyName && " — "}
              {t("إدارة وحداتك من مكان واحد", "Manage modules from one place")}
            </p>
          </div>
        </div>
        {canAccessBusinessPortal && (
          <Button variant="outline" size="sm" onClick={() => navigate("/business-portal")} className="gap-1.5 text-xs shrink-0">
            <Shield className="h-3.5 w-3.5" />
            {t("إدارة المنصة", "Platform Admin")}
          </Button>
        )}
      </div>

      {/* ═══ SUBSCRIPTION CARD ═══ */}
      <Card className="border-border/50 overflow-hidden">
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--gold)))" }} />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/5 text-primary">
                <Crown className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-heading font-bold text-xl">{planName}</h2>
                  {isActive && (
                    <Badge className="bg-success/10 text-success border-success/20 text-xs">
                      {isTrial ? t("تجريبي", "Trial") : t("فعّال", "Active")}
                    </Badge>
                  )}
                  {!isActive && <Badge variant="destructive" className="text-xs">{t("غير مشترك", "Inactive")}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {subscription.billing_cycle && <span>{subscription.billing_cycle === "yearly" ? t("سنوي", "Yearly") : t("شهري", "Monthly")}</span>}
                  {monthlyPrice > 0 && <span>{monthlyPrice} {currency}/{t("شهر", "mo")}</span>}
                  {subscription.end_date && <span>{t("التجديد:", "Renewal:")} {renewalDate}</span>}
                  {daysLeft !== null && daysLeft <= 14 && (
                    <span className="text-warning flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />{daysLeft} {t("يوم", "days")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/madad/billing")} className="gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />{t("الفواتير", "Billing")}
              </Button>
              <Button size="sm" onClick={() => navigate("/madad/modules")} className="gap-1.5">
                <Zap className="h-3.5 w-3.5" />{t("ترقية", "Upgrade")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ TRIAL COUNTDOWN BANNER ═══ */}
      {isTrial && subscription.trial_ends_at && (() => {
        const trialEnd = new Date(subscription.trial_ends_at);
        const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));
        const trialExpired = trialDaysLeft <= 0;
        return (
          <Card className={`border-border/50 overflow-hidden ${trialExpired ? "border-destructive/30 bg-destructive/5" : "border-info/30 bg-info/5"}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trialExpired ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-heading font-bold text-sm">
                    {trialExpired
                      ? t("انتهت الفترة التجريبية", "Trial Period Expired")
                      : t("الفترة التجريبية", "Trial Period")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trialExpired
                      ? t("اشترك الآن للاستمرار في استخدام المنصة", "Subscribe now to continue using the platform")
                      : `${trialDaysLeft} ${t("يوم متبقي — اشترك قبل انتهاء التجربة", "days remaining — subscribe before trial ends")}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/madad/billing")}
                className="gap-1.5 shrink-0"
                style={trialExpired ? { background: "hsl(var(--destructive))", color: "white" } : { background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}
              >
                <Zap className="h-3.5 w-3.5" />
                {t("اشترك الآن", "Subscribe Now")}
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* ═══ EXPIRED SUBSCRIPTION BANNER ═══ */}
      {!isActive && !isTrial && (
        <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm">{t("الاشتراك غير نشط", "Subscription Inactive")}</p>
                <p className="text-xs text-muted-foreground">{t("الوحدات مقفلة — اشترك لإعادة التفعيل", "Modules are locked — subscribe to reactivate")}</p>
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => navigate("/madad/billing")} className="gap-1.5 shrink-0">
              <Zap className="h-3.5 w-3.5" />
              {t("اشترك الآن", "Subscribe Now")}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { labelAr: "الوحدات النشطة", labelEn: "Active Modules", value: stats?.active_modules ?? activeModuleKeys.length, icon: Layers, color: "var(--primary)" },
          { labelAr: "الموظفون", labelEn: "Employees", value: stats?.employees ?? 0, icon: Users, color: MODULE_REGISTRY.tamkeen.hex },
          { labelAr: "الأقسام", labelEn: "Departments", value: stats?.departments ?? 0, icon: Building2, color: "hsl(var(--secondary))" },
          { labelAr: "الفروع", labelEn: "Branches", value: stats?.branches ?? 0, icon: Building2, color: MODULE_REGISTRY.tahseel?.hex || "#0FA968" },
          { labelAr: "الحجوزات", labelEn: "Bookings", value: stats?.bookings ?? 0, icon: CalendarCheck, color: MODULE_REGISTRY.tathbeet.hex },
          { labelAr: "موافقات معلّقة", labelEn: "Pending", value: stats?.pending_approvals ?? 0, icon: Clock, color: "hsl(var(--warning))" },
        ].map((m, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${m.color}15`, color: m.color }}>
                <m.icon className="h-5 w-5" />
              </div>
              <p className="font-heading font-bold text-2xl">{m.value}</p>
              <p className="text-xs text-muted-foreground">{t(m.labelAr, m.labelEn)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ HYBRID ACCESS (platform-wide) ═══ */}
      <HybridAccessSummaryCard variant="full" />

      {/* ═══ MODULE CONTROL PANEL ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl">{t("لوحة الوحدات", "Module Control Panel")}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/madad/modules")} className="gap-1 text-xs">
            {t("عرض الكل", "View All")}
            <Arrow className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_MODULE_KEYS.map((key) => {
            const mod = MODULE_REGISTRY[key];
            if (!mod) return null;
            const active = isModuleActive(key);
            const locked = !active;

            return (
              <Card
                key={key}
                className={`border-border/50 overflow-hidden transition-all duration-300 ${
                  active ? "cursor-pointer hover:shadow-elevated hover:-translate-y-0.5" : "opacity-55"
                }`}
                onClick={() => active && navigate(mod.route)}
              >
                {/* Module color bar */}
                <div className="h-1 w-full" style={{ background: `hsl(${mod.color})` }} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5" style={{ background: `hsl(${mod.color} / 0.08)` }}>
                      <img src={mod.iconLogo} alt={t(mod.nameAr, mod.nameEn)} className="h-8 w-8 object-contain" loading="lazy" />
                    </div>
                    {active && <Badge className="bg-success/10 text-success border-success/20 text-xs">{t("فعّال", "Active")}</Badge>}
                    {locked && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-6 px-2 gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate(`/madad/activate/${key}`); }}
                      >
                        {t("تفعيل", "Activate")}
                      </Button>
                    )}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold">{t(mod.nameAr, mod.nameEn)}</h3>
                    <p className="text-xs text-muted-foreground">{t(mod.descAr, mod.descEn)}</p>
                  </div>
                  {active && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-success" />{t("متصل", "Connected")}
                      </span>
                      <span className="flex items-center gap-1 font-medium" style={{ color: `hsl(${mod.color})` }}>
                        {t("فتح", "Open")}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══ USAGE + ACTIVITY ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("مراقبة الاستخدام", "Usage Monitoring")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageMeter labelAr="الموظفون" labelEn="Employees" used={stats?.employees ?? 0} limit={50} />
            <UsageMeter labelAr="الفروع" labelEn="Branches" used={stats?.branches ?? 0} limit={5} />
            <UsageMeter labelAr="الحجوزات (هذا الشهر)" labelEn="Bookings (this month)" used={stats?.bookings ?? 0} limit={500} />
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("بحاجة لسعة أكبر؟", "Need more capacity?")}</span>
              <Button variant="link" size="sm" className="text-xs p-0 h-auto text-primary" onClick={() => navigate("/madad/billing")}>
                {t("ترقية الآن", "Upgrade Now")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("آخر النشاطات", "Recent Activity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("لا توجد نشاطات حديثة", "No recent activity")}</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {stats.recent_activity.map((act, i) => {
                  const actionMeta = ACTION_LABELS[act.action] || { ar: act.action, color: "text-muted-foreground" };
                  return (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${act.action === "INSERT" ? "bg-success" : act.action === "DELETE" ? "bg-destructive" : "bg-info"}`} />
                      <div className="flex-1 min-w-0">
                        <p>
                          <span className={`font-medium ${actionMeta.color}`}>{actionMeta.ar}</span>{" "}
                          <span className="text-muted-foreground">{TABLE_LABELS[act.table_name] || act.table_name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: lang === "ar" ? ar : undefined })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ NOTIFICATIONS ═══ */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {t("الإشعارات", "Notifications")}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/madad/notifications")} className="text-xs gap-1">
              {t("عرض الكل", "View All")}
              <Arrow className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد إشعارات جديدة", "No new notifications")}</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.is_read ? "bg-transparent" : "bg-muted/50"}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: lang === "ar" ? ar : undefined })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageMeter({ labelAr, labelEn, used, limit }: { labelAr: string; labelEn: string; used: number; limit: number }) {
  const { t } = useLanguage();
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const isHigh = pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t(labelAr, labelEn)}</span>
        <span className={`font-medium ${isHigh ? "text-warning" : "text-foreground"}`}>{used}/{limit}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
