import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function AttendanceChart() {
  const { companyId } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-chart", companyId],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data } = await supabase
        .from("attendance_records")
        .select("date, hours_worked, overtime_hours")
        .eq("company_id", companyId!)
        .gte("date", sixMonthsAgo.toISOString().split("T")[0]);

      const monthly: Record<string, { month: string; hours: number; overtime: number; count: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthly[key] = { month: MONTHS_AR[d.getMonth()], hours: 0, overtime: 0, count: 0 };
      }

      data?.forEach((r) => {
        const key = r.date.substring(0, 7);
        if (monthly[key]) {
          monthly[key].hours += Number(r.hours_worked || 0);
          monthly[key].overtime += Number(r.overtime_hours || 0);
          monthly[key].count += 1;
        }
      });

      return Object.values(monthly);
    },
    enabled: !!companyId,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

  const chartConfig = {
    hours: { label: "ساعات العمل", color: "hsl(var(--primary))" },
    overtime: { label: "ساعات إضافية", color: "hsl(var(--gold))" },
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">الحضور — آخر 6 أشهر</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <BarChart data={data || []} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="hours" fill="var(--color-hours)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="overtime" fill="var(--color-overtime)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function PayrollChart() {
  const { companyId } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-chart", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_runs")
        .select("month, year, total_net, total_gross, total_deductions")
        .eq("company_id", companyId!)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(6);

      return (data || []).map((r) => ({
        month: MONTHS_AR[(r.month || 1) - 1],
        net: Number(r.total_net || 0),
        gross: Number(r.total_gross || 0),
        deductions: Number(r.total_deductions || 0),
      }));
    },
    enabled: !!companyId,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

  const chartConfig = {
    gross: { label: "إجمالي", color: "hsl(var(--primary))" },
    net: { label: "صافي", color: "hsl(var(--gold))" },
    deductions: { label: "استقطاعات", color: "hsl(var(--destructive))" },
  };

  const hasData = data && data.length > 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">الرواتب الشهرية</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="gross" stroke="var(--color-gross)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="deductions" stroke="var(--color-deductions)" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--card))", strokeWidth: 2 }} />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="text-center py-14 text-muted-foreground text-sm">
            لا توجد بيانات رواتب بعد — قم بتشغيل كشف رواتب أولاً
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LeaveChart() {
  const { companyId } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["leave-chart", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("status")
        .eq("company_id", companyId!);

      const counts = { approved: 0, pending: 0, rejected: 0 };
      data?.forEach((r) => {
        if (r.status === "approved") counts.approved++;
        else if (r.status === "pending") counts.pending++;
        else if (r.status === "rejected") counts.rejected++;
      });

      return [
        { name: "مقبولة", value: counts.approved, fill: "hsl(var(--success))" },
        { name: "معلقة", value: counts.pending, fill: "hsl(var(--warning))" },
        { name: "مرفوضة", value: counts.rejected, fill: "hsl(var(--destructive))" },
      ];
    },
    enabled: !!companyId,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

  const chartConfig = {
    approved: { label: "مقبولة", color: "hsl(var(--success))" },
    pending: { label: "معلقة", color: "hsl(var(--warning))" },
    rejected: { label: "مرفوضة", color: "hsl(var(--destructive))" },
  };

  const total = (data || []).reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">طلبات الإجازة</CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <ChartContainer config={chartConfig} className="h-[240px] w-full mx-auto aspect-square">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))">
                {data?.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="text-center py-14 text-muted-foreground text-sm">
            لا توجد طلبات إجازة بعد
          </div>
        )}
        {total > 0 && (
          <div className="flex justify-center gap-5 mt-3">
            {data?.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-muted-foreground">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
