import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { TrendingDown, ThumbsUp, ThumbsDown, Users, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const reasonLabels: Record<string, string> = {
  better_opportunity: "فرصة أفضل",
  compensation: "الراتب",
  management: "الإدارة",
  growth: "النمو",
  culture: "البيئة",
  relocation: "الانتقال",
  personal: "شخصية",
  retirement: "تقاعد",
  health: "صحية",
  worklife: "التوازن",
  other: "أخرى",
};

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))",
  "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1",
];

export function ExitAnalyticsDashboard() {
  const { companyId } = useCompany();

  const { data: surveys = [] } = useQuery({
    queryKey: ["exit-surveys", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exit_surveys" as any)
        .select("*, employees(name_ar, department_id, departments(name))")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  if (surveys.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-heading">لا توجد بيانات استبيانات خروج بعد</p>
          <p className="text-sm mt-1">أضف استبيانات مقابلة الخروج لمشاهدة التحليلات</p>
        </CardContent>
      </Card>
    );
  }

  // Compute stats
  const avgSatisfaction = (field: string) => {
    const vals = surveys.filter((s: any) => s[field]).map((s: any) => s[field]);
    return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : "—";
  };

  const radarData = [
    { subject: "الرضا العام", value: Number(avgSatisfaction("satisfaction_overall")) || 0 },
    { subject: "الإدارة", value: Number(avgSatisfaction("satisfaction_management")) || 0 },
    { subject: "الراتب", value: Number(avgSatisfaction("satisfaction_compensation")) || 0 },
    { subject: "النمو", value: Number(avgSatisfaction("satisfaction_growth")) || 0 },
    { subject: "البيئة", value: Number(avgSatisfaction("satisfaction_culture")) || 0 },
    { subject: "التوازن", value: Number(avgSatisfaction("satisfaction_worklife")) || 0 },
  ];

  // Reason distribution
  const reasonCounts: Record<string, number> = {};
  surveys.forEach((s: any) => {
    const r = s.primary_reason || "other";
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  });
  const reasonData = Object.entries(reasonCounts)
    .map(([key, count]) => ({ name: reasonLabels[key] || key, value: count }))
    .sort((a, b) => b.value - a.value);

  const recommendRate = surveys.filter((s: any) => s.would_recommend === true).length;
  const returnRate = surveys.filter((s: any) => s.would_return === true).length;

  // Department breakdown
  const deptCounts: Record<string, number> = {};
  surveys.forEach((s: any) => {
    const dept = s.employees?.departments?.name || "غير محدد";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">إجمالي الاستبيانات</p><p className="text-xl font-heading font-bold">{surveys.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Star className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">متوسط الرضا</p><p className="text-xl font-heading font-bold">{avgSatisfaction("satisfaction_overall")}/5</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><ThumbsUp className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">يوصون بالشركة</p><p className="text-xl font-heading font-bold">{surveys.length > 0 ? Math.round((recommendRate / surveys.length) * 100) : 0}%</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><ThumbsDown className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">لن يعودوا</p><p className="text-xl font-heading font-bold">{surveys.length > 0 ? Math.round(((surveys.length - returnRate) / surveys.length) * 100) : 0}%</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader><CardTitle className="font-heading text-base">مؤشرات الرضا الوظيفي</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reasons Pie Chart */}
        <Card>
          <CardHeader><CardTitle className="font-heading text-base">أسباب المغادرة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={reasonData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {reasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-heading text-base">المغادرون حسب القسم</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="عدد المغادرين" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Survey Highlights */}
      <Card>
        <CardHeader><CardTitle className="font-heading text-base">آخر الاستبيانات</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {surveys.slice(0, 5).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{s.employees?.name_ar || "موظف"}</p>
                  <p className="text-xs text-muted-foreground">{reasonLabels[s.primary_reason] || s.primary_reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i <= (s.satisfaction_overall || 0) ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                  {s.would_recommend !== null && (
                    <Badge variant="outline" className={s.would_recommend ? "text-primary" : "text-destructive"}>
                      {s.would_recommend ? "يوصي" : "لا يوصي"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
