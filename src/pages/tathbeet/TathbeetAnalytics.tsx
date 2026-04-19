import { FeatureSectionGuard } from "@/components/layout/FeatureRouteGuard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Users, TrendingUp, Clock, DollarSign, Brain, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { formatIQD } from "@/lib/tathbeet/bookingEngine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function TathbeetAnalytics() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: stats } = useQuery({
    queryKey: ["tathbeet-analytics", companyId],
    queryFn: async () => {
      const [totalRes, completedRes, cancelledRes, revenueRes, todayRes] = await Promise.all([
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "completed").gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "cancelled").gte("booking_date", thirtyDaysAgo),
        supabase.from("tathbeet_payments").select("amount").eq("company_id", companyId!).eq("status", "completed").gte("created_at", thirtyDaysAgo),
        supabase.from("tathbeet_bookings").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("booking_date", today),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const total = totalRes.count || 0;
      const completed = completedRes.count || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        cancelled: cancelledRes.count || 0,
        revenue: totalRevenue,
        todayCount: todayRes.count || 0,
        completionRate,
      };
    },
    enabled: !!companyId,
  });

  // Daily bookings for chart
  const { data: dailyData = [] } = useQuery({
    queryKey: ["tathbeet-daily-chart", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_bookings")
        .select("booking_date, status")
        .eq("company_id", companyId!)
        .gte("booking_date", format(subDays(new Date(), 14), "yyyy-MM-dd"))
        .order("booking_date");

      const map = new Map<string, number>();
      for (const b of data || []) {
        const d = b.booking_date;
        map.set(d, (map.get(d) || 0) + 1);
      }
      return Array.from(map.entries()).map(([date, count]) => ({
        date: date.slice(5),
        count,
      }));
    },
    enabled: !!companyId,
  });

  // Status distribution for pie chart
  const { data: statusDist = [] } = useQuery({
    queryKey: ["tathbeet-status-dist", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_bookings")
        .select("status")
        .eq("company_id", companyId!)
        .gte("booking_date", thirtyDaysAgo);

      const map = new Map<string, number>();
      for (const b of data || []) {
        map.set(b.status, (map.get(b.status) || 0) + 1);
      }
      return Array.from(map.entries()).map(([status, count]) => ({ name: status, value: count }));
    },
    enabled: !!companyId,
  });

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--muted))"];

  const cards = [
    { labelAr: "إجمالي الحجوزات", labelEn: "Total Bookings", value: stats?.total ?? 0, icon: <CalendarCheck className="h-5 w-5" />, sub: t("آخر 30 يوم", "Last 30 days") },
    { labelAr: "حجوزات اليوم", labelEn: "Today", value: stats?.todayCount ?? 0, icon: <Clock className="h-5 w-5" /> },
    { labelAr: "نسبة الإتمام", labelEn: "Completion Rate", value: `${stats?.completionRate ?? 0}%`, icon: <TrendingUp className="h-5 w-5" /> },
    { labelAr: "الإيرادات", labelEn: "Revenue", value: formatIQD(stats?.revenue ?? 0, lang), icon: <DollarSign className="h-5 w-5" />, sub: t("آخر 30 يوم", "Last 30 days") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-extrabold text-2xl">{t("التحليلات", "Analytics")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.12)", color: "hsl(var(--gold))" }}>{c.icon}</div>
                <p className="text-xs text-muted-foreground">{t(c.labelAr, c.labelEn)}</p>
              </div>
              <p className="font-heading font-bold text-xl">{c.value}</p>
              {c.sub && <p className="text-[10px] text-muted-foreground mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="font-heading font-bold text-sm mb-4">{t("الحجوزات اليومية", "Daily Bookings")}</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="font-heading font-bold text-sm mb-4">{t("توزيع الحالات", "Status Distribution")}</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {statusDist.map((s, i) => (
                <span key={i} className="text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {s.name} ({s.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section — only when feature enabled */}
      <FeatureSectionGuard featureKey="tathbeet_ai_analysis" hide>
        <AiInsightsWidget companyId={companyId} t={t} />
      </FeatureSectionGuard>
    </div>
  );
}

/* ─── AI Insights Widget for Reports ─── */
function AiInsightsWidget({ companyId, t }: { companyId: string | null; t: (ar: string, en: string) => string }) {
  const { data: insights = [] } = useQuery({
    queryKey: ["tathbeet-ai-report-insights", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_ai_insights")
        .select("*")
        .eq("company_id", companyId!)
        .order("generated_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: snapshot } = useQuery({
    queryKey: ["tathbeet-ai-report-snapshot", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_ai_snapshots")
        .select("*")
        .eq("company_id", companyId!)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  if (insights.length === 0 && !snapshot) return null;

  const severityIcon: Record<string, typeof AlertTriangle> = {
    critical: AlertTriangle, warning: AlertTriangle, info: Lightbulb, success: CheckCircle2,
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
          {t("تحليلات الذكاء الاصطناعي", "AI Insights")}
        </h3>

        {snapshot && (snapshot.summary_json as Record<string, string>)?.summary && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
            <p className="text-sm">{(snapshot.summary_json as Record<string, string>).summary}</p>
          </div>
        )}

        <div className="space-y-2">
          {insights.map((ins) => {
            const Icon = severityIcon[ins.severity] || Lightbulb;
            return (
              <div key={ins.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/20">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                  ins.severity === "critical" ? "text-destructive" :
                  ins.severity === "warning" ? "text-warning" :
                  ins.severity === "success" ? "text-success" : "text-primary"
                }`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{ins.title}</p>
                  {ins.recommendation && <p className="text-[10px] text-muted-foreground mt-0.5">{ins.recommendation}</p>}
                </div>
                <Badge variant="secondary" className="text-[9px] shrink-0">{ins.severity}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
