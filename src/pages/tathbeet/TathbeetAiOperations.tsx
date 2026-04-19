import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useResolvedAccess } from "@/hooks/useResolvedAccess";
import { FeatureSectionGuard } from "@/components/layout/FeatureRouteGuard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Brain, BarChart3, Lightbulb, Settings2, History, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, Users, MapPin, CalendarCheck, Activity,
  Zap, ArrowUpDown, ShieldCheck,
} from "lucide-react";
import { format, subDays } from "date-fns";

const severityIcon: Record<string, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Lightbulb,
  success: CheckCircle2,
};

export default function TathbeetAiOperations() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const { canAccess } = useResolvedAccess();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("analysis");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  // Permission-based tab visibility
  const canViewControl = canAccess("tathbeet_ai_control");
  const canViewSmartArrangement = canAccess("tathbeet_ai_smart_arrangement");

  /* ─── Booking metrics ─── */
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["tathbeet-ai-metrics", companyId],
    queryFn: async () => {
      const [totalRes, completedRes, cancelledRes, noShowRes, todayRes, staffRes, branchRes, serviceRes] = await Promise.all([
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "completed").gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "cancelled").gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "no_show").gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("booking_date", format(new Date(), "yyyy-MM-dd")),
        supabase.from("tathbeet_staff_profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("booking_enabled", true),
        supabase.from("tathbeet_branches").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("tathbeet_services").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "active"),
      ]);

      const total = totalRes.count || 0;
      const completed = completedRes.count || 0;
      const cancelled = cancelledRes.count || 0;
      const noShow = noShowRes.count || 0;

      return {
        total, completed, cancelled, noShow,
        todayCount: todayRes.count || 0,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
        noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
        activeStaff: staffRes.count || 0,
        branches: branchRes.count || 0,
        activeServices: serviceRes.count || 0,
      };
    },
    enabled: !!companyId,
  });

  /* ─── Hourly distribution ─── */
  const { data: hourlyData = [] } = useQuery({
    queryKey: ["tathbeet-ai-hourly", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_bookings")
        .select("time_slot, status")
        .eq("company_id", companyId!)
        .gte("booking_date", thirtyDaysAgo);

      const hours = new Map<number, { total: number; completed: number }>();
      for (let h = 8; h <= 22; h++) hours.set(h, { total: 0, completed: 0 });

      for (const b of data || []) {
        if (!b.time_slot) continue;
        const hour = parseInt(b.time_slot.split(":")[0]);
        const entry = hours.get(hour) || { total: 0, completed: 0 };
        entry.total++;
        if (b.status === "completed") entry.completed++;
        hours.set(hour, entry);
      }

      return Array.from(hours.entries())
        .map(([hour, { total, completed }]) => ({ hour, label: `${hour}:00`, total, completed }))
        .sort((a, b) => a.hour - b.hour);
    },
    enabled: !!companyId,
  });

  /* ─── Staff load ─── */
  const { data: staffLoad = [] } = useQuery({
    queryKey: ["tathbeet-ai-staff-load", companyId],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("tathbeet_bookings")
        .select("staff_profile_id")
        .eq("company_id", companyId!)
        .gte("booking_date", thirtyDaysAgo);

      const { data: staffList } = await supabase
        .from("tathbeet_staff_profiles")
        .select("id, display_name")
        .eq("company_id", companyId!)
        .eq("booking_enabled", true);

      const loadMap = new Map<string, number>();
      for (const b of bookings || []) {
        if (b.staff_profile_id) loadMap.set(b.staff_profile_id, (loadMap.get(b.staff_profile_id) || 0) + 1);
      }

      return (staffList || []).map(s => ({
        id: s.id,
        name: s.display_name || "—",
        bookings: loadMap.get(s.id) || 0,
      })).sort((a, b) => b.bookings - a.bookings);
    },
    enabled: !!companyId,
  });

  /* ─── AI insights from DB ─── */
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["tathbeet-ai-insights", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_ai_insights")
        .select("*")
        .eq("company_id", companyId!)
        .order("generated_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!companyId,
  });

  /* ─── AI recommendations from DB ─── */
  const { data: recommendations = [] } = useQuery({
    queryKey: ["tathbeet-ai-recommendations", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_ai_recommendations")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!companyId,
  });

  /* ─── Generate AI analysis ─── */
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("tathbeet-ai-operations", {
        body: { company_id: companyId, action: "analyze" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(t("تم تحليل البيانات بنجاح", "Analysis completed successfully"));
      qc.invalidateQueries({ queryKey: ["tathbeet-ai-insights"] });
      qc.invalidateQueries({ queryKey: ["tathbeet-ai-recommendations"] });
    },
    onError: (err: Error) => {
      toast.error(t("فشل التحليل", "Analysis failed"), { description: err.message });
    },
  });

  /* ─── Dynamic insights from metrics ─── */
  const dynamicInsights: Array<{ title: string; desc: string; severity: string }> = [];
  if (metrics) {
    const peakHour = hourlyData.reduce((max, h) => (h.total > max.total ? h : max), { hour: 0, total: 0, label: "", completed: 0 });

    if (metrics.cancellationRate > 20) {
      dynamicInsights.push({
        title: t("نسبة إلغاء مرتفعة", "High Cancellation Rate"),
        desc: t(`نسبة الإلغاء ${metrics.cancellationRate}% — يُنصح بمراجعة سياسة الحجز`, `Cancellation rate is ${metrics.cancellationRate}% — review booking policy`),
        severity: "warning",
      });
    }
    if (metrics.noShowRate > 10) {
      dynamicInsights.push({
        title: t("نسبة عدم حضور مرتفعة", "High No-Show Rate"),
        desc: t(`${metrics.noShowRate}% من الحجوزات لم يحضر لها — فعّل التذكيرات`, `${metrics.noShowRate}% no-show rate — enable reminders`),
        severity: "critical",
      });
    }
    if (peakHour.total > 0) {
      dynamicInsights.push({
        title: t("ذروة الحجوزات", "Peak Booking Hour"),
        desc: t(`أعلى ضغط في الساعة ${peakHour.label} — تأكد من كفاية الطاقم`, `Peak at ${peakHour.label} — ensure adequate staffing`),
        severity: "info",
      });
    }
    if (staffLoad.length > 0) {
      const maxLoad = staffLoad[0];
      const minLoad = staffLoad[staffLoad.length - 1];
      if (maxLoad.bookings > 0 && minLoad.bookings === 0) {
        dynamicInsights.push({
          title: t("توزيع غير متوازن", "Unbalanced Staff Load"),
          desc: t(`${maxLoad.name} لديه ${maxLoad.bookings} حجز بينما ${minLoad.name} بدون حجوزات`, `${maxLoad.name} has ${maxLoad.bookings} bookings while ${minLoad.name} has none`),
          severity: "warning",
        });
      }
    }
    if (metrics.completionRate >= 80) {
      dynamicInsights.push({
        title: t("أداء ممتاز", "Excellent Performance"),
        desc: t(`نسبة إتمام ${metrics.completionRate}% — أداء تشغيلي ممتاز`, `${metrics.completionRate}% completion rate — excellent operational performance`),
        severity: "success",
      });
    }
  }

  /* ─── Health Score ─── */
  const healthScore = metrics
    ? Math.min(100, Math.max(0, Math.round(
        metrics.completionRate * 0.4 +
        (100 - metrics.cancellationRate) * 0.3 +
        (100 - metrics.noShowRate) * 0.3
      )))
    : 0;
  const healthColor = healthScore >= 80 ? "text-success" : healthScore >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
            <Brain className="h-6 w-6" style={{ color: "hsl(var(--gold))" }} />
            {t("الذكاء التشغيلي", "AI Operations")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("تحليل ذكي للحجوزات والعمليات", "Smart booking and operations analysis")}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ShieldCheck className="h-3 w-3 text-success" />
            <span className="text-[10px] text-muted-foreground">{t("تحليل بناءً على بياناتك فقط", "Analysis based on your data only")}</span>
          </div>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          {t("تحليل الآن", "Analyze Now")}
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {metricsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <MetricCard icon={<Activity className="h-4 w-4" />} label={t("صحة النظام", "System Health")} value={`${healthScore}%`} className={healthColor} />
            <MetricCard icon={<CalendarCheck className="h-4 w-4" />} label={t("إجمالي الحجوزات", "Total Bookings")} value={metrics?.total ?? 0} />
            <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={t("نسبة الإتمام", "Completion")} value={`${metrics?.completionRate ?? 0}%`} className="text-success" />
            <MetricCard icon={<TrendingDown className="h-4 w-4" />} label={t("الإلغاءات", "Cancellations")} value={`${metrics?.cancellationRate ?? 0}%`} className={metrics && metrics.cancellationRate > 15 ? "text-destructive" : ""} />
            <MetricCard icon={<Users className="h-4 w-4" />} label={t("الطاقم النشط", "Active Staff")} value={metrics?.activeStaff ?? 0} />
            <MetricCard icon={<MapPin className="h-4 w-4" />} label={t("الفروع", "Branches")} value={metrics?.branches ?? 0} />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="analysis" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{t("التحليل", "Analysis")}</TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />{t("التوصيات", "Recommendations")}</TabsTrigger>
          {canViewControl && <TabsTrigger value="control" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />{t("التحكم", "Control")}</TabsTrigger>}
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />{t("السجل", "History")}</TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6 mt-4">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
                {t("ملخص ذكي", "Smart Summary")}
              </h3>
              {dynamicInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("لا توجد بيانات كافية للتحليل", "Insufficient data for analysis")}</p>
              ) : (
                <div className="space-y-3">
                  {dynamicInsights.map((insight, i) => {
                    const Icon = severityIcon[insight.severity] || Lightbulb;
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                          insight.severity === "critical" ? "text-destructive" :
                          insight.severity === "warning" ? "text-warning" :
                          insight.severity === "success" ? "text-success" : "text-primary"
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{insight.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
                {t("خريطة ساعات الذروة", "Peak Hours Heatmap")}
              </h3>
              <div className="flex gap-1 flex-wrap">
                {hourlyData.map(h => {
                  const maxTotal = Math.max(...hourlyData.map(x => x.total), 1);
                  const intensity = h.total / maxTotal;
                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1" title={`${h.label}: ${h.total}`}>
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: `hsl(var(--primary) / ${0.1 + intensity * 0.8})`,
                          color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                        }}
                      >
                        {h.total}
                      </div>
                      <span className="text-[9px] text-muted-foreground">{h.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Staff Load */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
                {t("توزيع حمل الطاقم", "Staff Load Balance")}
              </h3>
              {staffLoad.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("لا يوجد طاقم", "No staff data")}</p>
              ) : (
                <div className="space-y-2">
                  {staffLoad.slice(0, 10).map(s => {
                    const maxBookings = Math.max(...staffLoad.map(x => x.bookings), 1);
                    const pct = Math.round((s.bookings / maxBookings) * 100);
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xs w-24 truncate">{s.name}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-left">{s.bookings}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-sm mb-4">{t("توصيات التشغيل", "Operational Recommendations")}</h3>
              {recommendations.length === 0 && dynamicInsights.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{t("اضغط 'تحليل الآن' للحصول على توصيات ذكية", "Press 'Analyze Now' for smart recommendations")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((r) => (
                    <div key={r.id} className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">{r.recommendation_type}</Badge>
                        <Badge variant={r.status === "applied" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                      </div>
                      <p className="text-sm">{(r.payload as Record<string, string>)?.title || r.recommendation_type}</p>
                      <p className="text-xs text-muted-foreground">{(r.payload as Record<string, string>)?.description || ""}</p>
                    </div>
                  ))}
                  {dynamicInsights.filter(i => i.severity !== "success" && i.severity !== "info").map((ins, i) => (
                    <div key={`dyn-${i}`} className="p-4 rounded-lg border border-border/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-warning" />
                        <p className="text-sm font-medium">{ins.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{ins.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Control Tab — gated by feature */}
        <TabsContent value="control" className="space-y-4 mt-4">
          <FeatureSectionGuard featureKey="tathbeet_ai_control" hide>
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
                <Settings2 className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
                {t("توصيات التحكم بالنظام", "System Control Recommendations")}
              </h3>
              <div className="space-y-3">
                <ControlCard title={t("تعديل التغطية في ساعات الذروة", "Adjust Peak Hour Coverage")} desc={t("زِد عدد الطاقم المتاح خلال الساعات 4–7 مساءً", "Increase staff availability during 4–7 PM")} severity="warning" t={t} />
                <ControlCard title={t("تقليل مخاطر الحجز الزائد", "Reduce Overbooking Risk")} desc={t("اضبط فترات الراحة بين الحجوزات لتقليل التزاحم", "Add buffer times between bookings")} severity="info" t={t} />
                <ControlCard title={t("توزيع الحجوزات بين الفروع", "Balance Across Branches")} desc={t("وجّه الحجوزات للفروع الأقل ازدحاماً تلقائياً", "Route bookings to less congested branches")} severity="info" t={t} />
                <ControlCard title={t("تفعيل قائمة الانتظار", "Enable Waitlist")} desc={t("فعّل قائمة الانتظار في أوقات الطلب المرتفع", "Enable waitlist during high-demand periods")} severity="info" t={t} />
              </div>
            </CardContent>
          </Card>
          </FeatureSectionGuard>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-sm mb-4">{t("سجل التحليلات", "Analysis History")}</h3>
              {insightsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : insights.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("لا يوجد سجل تحليلات بعد", "No analysis history yet")}</p>
              ) : (
                <div className="space-y-2">
                  {insights.map((ins) => (
                    <div key={ins.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/20">
                      <Badge variant="secondary" className="text-[10px] mt-0.5 shrink-0">{ins.severity}</Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ins.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{ins.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(ins.generated_at), "yyyy-MM-dd HH:mm")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: string | number; className?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>{icon}</div>
          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        </div>
        <p className={`font-heading font-bold text-lg ${className}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ControlCard({ title, desc, severity, t }: { title: string; desc: string; severity: string; t: (ar: string, en: string) => string }) {
  return (
    <div className="p-4 rounded-lg bg-muted/20 border border-border/30 flex items-start gap-3">
      <Settings2 className={`h-4 w-4 mt-0.5 shrink-0 ${severity === "warning" ? "text-warning" : "text-primary"}`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Button variant="outline" size="sm" className="text-[10px] h-7 shrink-0">{t("تطبيق", "Apply")}</Button>
    </div>
  );
}
