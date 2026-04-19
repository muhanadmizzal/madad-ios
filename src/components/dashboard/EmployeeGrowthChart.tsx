import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function EmployeeGrowthChart() {
  const { companyId } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["employee-growth", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("hire_date")
        .eq("company_id", companyId!)
        .not("hire_date", "is", null)
        .order("hire_date");

      const now = new Date();
      const months: { month: string; hires: number; cumulative: number }[] = [];
      let cumulative = 0;

      const startWindow = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      data?.forEach((e: any) => {
        if (new Date(e.hire_date) < startWindow) cumulative++;
      });

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const hires = data?.filter((e: any) => e.hire_date?.startsWith(key)).length || 0;
        cumulative += hires;
        months.push({ month: MONTHS_AR[d.getMonth()], hires, cumulative });
      }

      return months;
    },
    enabled: !!companyId,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

  const chartConfig = {
    cumulative: { label: "إجمالي الموظفين", color: "hsl(var(--primary))" },
    hires: { label: "تعيينات جديدة", color: "hsl(var(--gold))" },
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">نمو القوى العاملة (12 شهر)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <AreaChart data={data || []} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="url(#growthGrad)" strokeWidth={2.5} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
